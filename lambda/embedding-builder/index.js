const AWS = require('aws-sdk');
const OpenAI = require('openai');

// Initialize AWS services
const s3 = new AWS.S3();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const BUCKET_NAME = 'juliabaucher-cv-kb';
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks
const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Lambda handler triggered by S3 events when files are added/updated in kb/raw/
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Process each S3 record
    for (const record of event.Records) {
      if (record.eventSource === 'aws:s3') {
        await processS3Event(record);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Embeddings processed successfully' })
    };
  } catch (error) {
    console.error('Error processing embeddings:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * Process a single S3 event record
 */
async function processS3Event(record) {
  const bucketName = record.s3.bucket.name;
  const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  
  console.log(`Processing file: ${objectKey} from bucket: ${bucketName}`);

  // Only process files in kb/raw/ directory
  if (!objectKey.startsWith('kb/raw/')) {
    console.log('Skipping file not in kb/raw/ directory');
    return;
  }

  // Skip if this is a delete event
  if (record.eventName.startsWith('ObjectRemoved')) {
    console.log('File deleted, skipping embedding generation');
    return;
  }

  try {
    // Download the file content from S3
    const fileContent = await downloadFileFromS3(bucketName, objectKey);
    
    // Extract document name from file path
    const documentName = extractDocumentName(objectKey);
    
    // Chunk the content
    const chunks = chunkText(fileContent, documentName);
    
    // Generate embeddings for all chunks
    const embeddedChunks = await generateEmbeddings(chunks);
    
    // Save embeddings to S3
    await saveEmbeddingsToS3(bucketName, documentName, embeddedChunks);
    
    console.log(`Successfully processed ${chunks.length} chunks for document: ${documentName}`);
    
  } catch (error) {
    console.error(`Error processing file ${objectKey}:`, error);
    throw error;
  }
}

/**
 * Download file content from S3
 */
async function downloadFileFromS3(bucketName, objectKey) {
  const params = {
    Bucket: bucketName,
    Key: objectKey
  };

  const response = await s3.getObject(params).promise();
  return response.Body.toString('utf-8');
}

/**
 * Extract document name from S3 object key
 */
function extractDocumentName(objectKey) {
  // Extract filename without extension from path like "kb/raw/julia-profile.md"
  const filename = objectKey.split('/').pop();
  return filename.replace(/\.[^/.]+$/, ''); // Remove file extension
}

/**
 * Chunk text into smaller pieces for embedding
 */
function chunkText(text, documentName) {
  const chunks = [];
  
  // Clean and normalize the text
  const cleanText = text.replace(/\r\n/g, '\n').trim();
  
  // Split by markdown headers first to preserve structure
  const sections = splitByHeaders(cleanText);
  
  for (const section of sections) {
    if (section.content.length <= CHUNK_SIZE) {
      // Section is small enough, use as single chunk
      chunks.push({
        id: `${documentName}_${chunks.length}`,
        content: section.content.trim(),
        metadata: {
          document: documentName,
          section: section.header || 'main',
          chunk_index: chunks.length
        }
      });
    } else {
      // Section is too large, split into smaller chunks
      const subChunks = splitLargeSection(section.content, CHUNK_SIZE, CHUNK_OVERLAP);
      
      for (let i = 0; i < subChunks.length; i++) {
        chunks.push({
          id: `${documentName}_${chunks.length}`,
          content: subChunks[i].trim(),
          metadata: {
            document: documentName,
            section: section.header || 'main',
            chunk_index: chunks.length,
            sub_chunk: i
          }
        });
      }
    }
  }
  
  return chunks;
}

/**
 * Split text by markdown headers to preserve document structure
 */
function splitByHeaders(text) {
  const sections = [];
  const lines = text.split('\n');
  let currentSection = { header: null, content: '' };
  
  for (const line of lines) {
    if (line.match(/^#{1,2}\s+/)) {
      // Found a header, save previous section if it has content
      if (currentSection.content.trim()) {
        sections.push({
          header: currentSection.header,
          content: currentSection.content.trim()
        });
      }
      
      // Start new section
      currentSection = {
        header: line.replace(/^#{1,2}\s+/, '').trim(),
        content: line + '\n'
      };
    } else {
      currentSection.content += line + '\n';
    }
  }
  
  // Add the last section
  if (currentSection.content.trim()) {
    sections.push({
      header: currentSection.header,
      content: currentSection.content.trim()
    });
  }
  
  return sections.length > 0 ? sections : [{ header: null, content: text }];
}

/**
 * Split large section into smaller chunks with overlap
 */
function splitLargeSection(text, chunkSize, overlap) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // If this isn't the last chunk, try to break at a sentence or word boundary
    if (end < text.length) {
      // Look for sentence boundary within the last 100 characters
      const sentenceEnd = text.lastIndexOf('.', end);
      const questionEnd = text.lastIndexOf('?', end);
      const exclamationEnd = text.lastIndexOf('!', end);
      
      const bestSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      if (bestSentenceEnd > start + chunkSize - 100) {
        end = bestSentenceEnd + 1;
      } else {
        // Look for word boundary
        const spaceIndex = text.lastIndexOf(' ', end);
        if (spaceIndex > start + chunkSize - 50) {
          end = spaceIndex;
        }
      }
    }
    
    chunks.push(text.substring(start, end));
    start = end - overlap;
    
    // Prevent infinite loop
    if (start >= end) {
      start = end;
    }
  }
  
  return chunks;
}

/**
 * Generate embeddings for all chunks using OpenAI
 */
async function generateEmbeddings(chunks) {
  const embeddedChunks = [];
  
  // Process chunks in batches to avoid rate limits
  const batchSize = 10;
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchTexts = batch.map(chunk => chunk.content);
    
    try {
      console.log(`Generating embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batchTexts,
        encoding_format: 'float'
      });
      
      // Combine chunks with their embeddings
      for (let j = 0; j < batch.length; j++) {
        embeddedChunks.push({
          ...batch[j],
          embedding: response.data[j].embedding
        });
      }
      
      // Small delay to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Error generating embeddings for batch starting at index ${i}:`, error);
      throw error;
    }
  }
  
  return embeddedChunks;
}

/**
 * Save embeddings to S3 in the kb/embeddings/ directory
 */
async function saveEmbeddingsToS3(bucketName, documentName, embeddedChunks) {
  const embeddingsData = {
    document: documentName,
    created_at: new Date().toISOString(),
    model: EMBEDDING_MODEL,
    chunk_count: embeddedChunks.length,
    chunks: embeddedChunks
  };
  
  const params = {
    Bucket: bucketName,
    Key: `kb/embeddings/${documentName}.json`,
    Body: JSON.stringify(embeddingsData, null, 2),
    ContentType: 'application/json'
  };
  
  await s3.putObject(params).promise();
  console.log(`Saved embeddings to: kb/embeddings/${documentName}.json`);
}