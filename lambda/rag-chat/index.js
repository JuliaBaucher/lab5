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
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';
const MAX_CONTEXT_CHUNKS = 5;
const SIMILARITY_THRESHOLD = 0.7;
const ALLOWED_ORIGIN = 'https://juliabaucher.github.io';

// Cache for embeddings to avoid repeated S3 calls
let embeddingsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Lambda handler for RAG-enabled chat
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle preflight CORS requests
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse(200, { message: 'CORS preflight' });
  }

  try {
    // Validate request method
    if (event.httpMethod !== 'POST') {
      return corsResponse(405, { error: 'Method not allowed' });
    }

    // Validate CORS origin
    const origin = event.headers?.origin || event.headers?.Origin;
    if (origin !== ALLOWED_ORIGIN) {
      console.log(`Blocked request from unauthorized origin: ${origin}`);
      return corsResponse(403, { error: 'Forbidden: Invalid origin' });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return corsResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { message } = requestBody;
    
    if (!message || typeof message !== 'string') {
      return corsResponse(400, { error: 'Missing or invalid message' });
    }

    if (message.length > 1000) {
      return corsResponse(400, { error: 'Message too long. Maximum length is 1000 characters.' });
    }

    // Generate response using RAG
    const response = await generateRAGResponse(message.trim());

    return corsResponse(200, {
      reply: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    
    // Return user-friendly error message
    return corsResponse(500, { 
      error: 'I apologize, but I encountered an error. Please try again in a moment.' 
    });
  }
};

/**
 * Generate RAG-enhanced response
 */
async function generateRAGResponse(userMessage) {
  try {
    // Load embeddings from S3 (with caching)
    const allEmbeddings = await loadEmbeddings();
    
    if (!allEmbeddings || allEmbeddings.length === 0) {
      console.log('No embeddings found, falling back to basic response');
      return await generateBasicResponse(userMessage);
    }

    // Generate embedding for user query
    const queryEmbedding = await generateQueryEmbedding(userMessage);
    
    // Find most relevant chunks
    const relevantChunks = findRelevantChunks(queryEmbedding, allEmbeddings);
    
    if (relevantChunks.length === 0) {
      console.log('No relevant chunks found, using basic response');
      return await generateBasicResponse(userMessage);
    }

    // Generate response with context
    return await generateContextualResponse(userMessage, relevantChunks);

  } catch (error) {
    console.error('Error in RAG pipeline:', error);
    // Fallback to basic response
    return await generateBasicResponse(userMessage);
  }
}

/**
 * Load embeddings from S3 with caching
 */
async function loadEmbeddings() {
  const now = Date.now();
  
  // Return cached embeddings if still valid
  if (embeddingsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('Using cached embeddings');
    return embeddingsCache;
  }

  try {
    console.log('Loading embeddings from S3');
    
    // List all embedding files
    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: 'kb/embeddings/',
      MaxKeys: 100
    };

    const listResponse = await s3.listObjectsV2(listParams).promise();
    const embeddingFiles = listResponse.Contents?.filter(obj => obj.Key.endsWith('.json')) || [];

    if (embeddingFiles.length === 0) {
      console.log('No embedding files found');
      return [];
    }

    // Load all embedding files
    const allEmbeddings = [];
    
    for (const file of embeddingFiles) {
      try {
        const getParams = {
          Bucket: BUCKET_NAME,
          Key: file.Key
        };

        const response = await s3.getObject(getParams).promise();
        const embeddingData = JSON.parse(response.Body.toString('utf-8'));
        
        if (embeddingData.chunks && Array.isArray(embeddingData.chunks)) {
          allEmbeddings.push(...embeddingData.chunks);
        }
        
      } catch (error) {
        console.error(`Error loading embedding file ${file.Key}:`, error);
        // Continue with other files
      }
    }

    // Update cache
    embeddingsCache = allEmbeddings;
    cacheTimestamp = now;
    
    console.log(`Loaded ${allEmbeddings.length} embedding chunks from ${embeddingFiles.length} files`);
    return allEmbeddings;

  } catch (error) {
    console.error('Error loading embeddings from S3:', error);
    return [];
  }
}

/**
 * Generate embedding for user query
 */
async function generateQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

/**
 * Find most relevant chunks using cosine similarity
 */
function findRelevantChunks(queryEmbedding, allEmbeddings) {
  const similarities = allEmbeddings.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // Filter by similarity threshold and sort by relevance
  const relevantChunks = similarities
    .filter(chunk => chunk.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_CONTEXT_CHUNKS);

  console.log(`Found ${relevantChunks.length} relevant chunks with similarities:`, 
    relevantChunks.map(c => c.similarity.toFixed(3)));

  return relevantChunks;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Generate response with relevant context
 */
async function generateContextualResponse(userMessage, relevantChunks) {
  // Build context from relevant chunks
  const context = relevantChunks
    .map(chunk => `[${chunk.metadata.document}] ${chunk.content}`)
    .join('\n\n');

  const systemPrompt = `You are Julia Baucher's AI assistant for recruiters and potential employers.

IMPORTANT INSTRUCTIONS:
- Speak as Julia in first person ("I am", "I have", "my experience", etc.)
- Be professional, concise, and friendly
- Use the provided context to answer questions accurately
- If the context doesn't contain relevant information, use your general knowledge about Julia
- Offer to provide more details or direct them to specific sections of the CV when helpful
- Answer in the same language as the user's question when possible

CONTEXT FROM JULIA'S KNOWLEDGE BASE:
${context}

Remember: You are representing Julia Baucher, so respond as if you are Julia herself.`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating contextual response:', error);
    throw error;
  }
}

/**
 * Generate basic response without RAG (fallback)
 */
async function generateBasicResponse(userMessage) {
  const basicSystemPrompt = `You are Julia Baucher's AI assistant for recruiters.
Speak as Julia: professional, concise, friendly. 

Key facts about Julia:
- Senior BI Product Manager at Amazon (2021–2025): logistics optimization webapps, forecasting ML, BI dashboards
- Product Manager & Consultant at Amadeus (2013–2020): Airline Revenue Accounting, consulting for major airlines
- Earlier: e-commerce product management, research at University of Cambridge, data analyst at McKinsey
- Education: PhD École des Mines de Paris
- Languages: Russian native; French/English fluent; Spanish basic
- Skills: Python, SQL, Tableau, ML, Product Management, UX Design

Answer in the user's language when possible.`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: basicSystemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating basic response:', error);
    return "I apologize, but I'm having trouble responding right now. Please feel free to review my CV directly or contact me via email at juliabaucher.work@gmail.com.";
  }
}

/**
 * Create CORS-enabled response
 */
function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}