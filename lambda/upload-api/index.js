const AWS = require('aws-sdk');

// Initialize AWS services
const s3 = new AWS.S3();

// Configuration
const BUCKET_NAME = 'juliabaucher-cv-kb';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ALLOWED_ORIGIN = 'https://juliabaucher.github.io';

/**
 * Lambda handler for admin knowledge base uploads
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

    // Validate admin token
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return corsResponse(401, { error: 'Unauthorized: Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (token !== ADMIN_TOKEN) {
      console.log('Invalid admin token provided');
      return corsResponse(401, { error: 'Unauthorized: Invalid admin token' });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return corsResponse(400, { error: 'Invalid JSON in request body' });
    }

    // Validate required fields
    const { documentName, content } = requestBody;
    
    if (!documentName || typeof documentName !== 'string') {
      return corsResponse(400, { error: 'Missing or invalid documentName' });
    }

    if (!content || typeof content !== 'string') {
      return corsResponse(400, { error: 'Missing or invalid content' });
    }

    // Validate document name (security: prevent path traversal)
    if (!/^[a-zA-Z0-9_-]+$/.test(documentName)) {
      return corsResponse(400, { 
        error: 'Invalid document name. Only letters, numbers, hyphens, and underscores are allowed.' 
      });
    }

    // Validate content length
    if (content.length > 100000) { // 100KB limit
      return corsResponse(400, { error: 'Content too large. Maximum size is 100KB.' });
    }

    // Upload to S3
    await uploadToS3(documentName.trim(), content.trim());

    console.log(`Successfully uploaded document: ${documentName}`);

    return corsResponse(200, {
      message: 'Document uploaded successfully',
      documentName: documentName,
      contentLength: content.length,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    
    // Don't expose internal error details to client
    return corsResponse(500, { 
      error: 'Internal server error. Please try again later.' 
    });
  }
};

/**
 * Upload document content to S3
 */
async function uploadToS3(documentName, content) {
  const key = `kb/raw/${documentName}.md`;
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'text/markdown',
    Metadata: {
      'uploaded-by': 'admin-api',
      'uploaded-at': new Date().toISOString()
    }
  };

  try {
    await s3.putObject(params).promise();
    console.log(`Document uploaded to S3: ${key}`);
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload document to storage');
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