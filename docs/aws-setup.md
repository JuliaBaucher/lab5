# AWS Setup Guide for RAG + Editable Knowledge Base

This guide provides step-by-step instructions for setting up the AWS infrastructure required for Julia's CV website with RAG-enabled chatbot and editable knowledge base.

## Prerequisites

- AWS Account with appropriate permissions
- OpenAI API key
- Basic familiarity with AWS Console

## Architecture Overview

```
GitHub Pages (Frontend)
    ↓
Admin Page → Upload API Lambda → S3 (kb/raw/)
                                    ↓ (S3 Event Trigger)
                              Embedding Builder Lambda
                                    ↓
                              S3 (kb/embeddings/)
                                    ↑
Website Chatbot → RAG Chat Lambda ←┘
```

## Step 1: S3 Bucket Setup

### 1.1 Create S3 Bucket
Using AWS Console:
1. Navigate to S3 service
2. Click "Create bucket"
3. Bucket name: `juliabaucher-cv-kb`
4. Region: `eu-north-1`
5. Click "Create bucket"

### 1.2 Configure Bucket Settings
- **Block Public Access**: Enable all settings (bucket should remain private)
- **Versioning**: Enable (recommended for knowledge base files)
- **Server-side encryption**: Enable with S3 managed keys

### 1.3 Create Folder Structure
Create the following folders in the S3 bucket:
- `kb/raw/` - For original markdown files
- `kb/embeddings/` - For generated embedding files

## Step 2: IAM Roles and Policies

### 2.1 Embedding Builder Lambda Role

Create IAM role: `EmbeddingBuilderLambdaRole`

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Permissions Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::juliabaucher-cv-kb/kb/raw/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::juliabaucher-cv-kb/kb/embeddings/*"
    }
  ]
}
```

### 2.2 Upload API Lambda Role

Create IAM role: `UploadAPILambdaRole`

**Trust Policy:** (Same as above)

**Permissions Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::juliabaucher-cv-kb/kb/raw/*"
    }
  ]
}
```

### 2.3 RAG Chat Lambda Role

Update existing role: `JuliaBaucher_CV-backend-RAG-role-mni8m304`

**Trust Policy:** (Same as above)

**Permissions Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::juliabaucher-cv-kb",
        "arn:aws:s3:::juliabaucher-cv-kb/kb/embeddings/*"
      ]
    }
  ]
}
```

## Step 3: Lambda Functions Deployment

### 3.1 Embedding Builder Lambda

1. **Create Lambda Function via AWS Console:**
   - Name: `JuliaBaucher_CV-embedding-builder`
   - Runtime: Node.js 18.x
   - Role: `EmbeddingBuilderLambdaRole`
   - Timeout: 5 minutes
   - Memory: 512 MB

2. **Environment Variables:**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Deploy Code via AWS Console:**
   - Copy the code from `lambda/embedding-builder/index.js`
   - Paste directly into the AWS Console code editor
   - Add dependencies by updating package.json in the console

4. **Configure S3 Trigger:**
   - Event type: `s3:ObjectCreated:*`
   - Bucket: `juliabaucher-cv-kb`
   - Prefix: `kb/raw/`
   - Suffix: `.md`

### 3.2 Upload API Lambda

1. **Create Lambda Function via AWS Console:**
   - Name: `JuliaBaucher_CV-upload-api`
   - Runtime: Node.js 18.x
   - Role: `UploadAPILambdaRole`
   - Timeout: 30 seconds
   - Memory: 256 MB

2. **Environment Variables:**
   ```
   ADMIN_TOKEN=your_secure_admin_token_here
   ```

3. **Deploy Code via AWS Console:**
   - Copy the code from `lambda/upload-api/index.js`
   - Paste directly into the AWS Console code editor

### 3.3 RAG Chat Lambda

1. **Update Existing Lambda Function via AWS Console:**
   - Name: `JuliaBaucher_CV-backend-RAG` (existing)
   - Runtime: Node.js 18.x
   - Role: `JuliaBaucher_CV-backend-RAG-role-mni8m304`
   - Timeout: 30 seconds
   - Memory: 512 MB

2. **Environment Variables:**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Deploy Code via AWS Console:**
   - Copy the code from `lambda/rag-chat/index.js`
   - Paste directly into the AWS Console code editor
   - Update dependencies as needed

## Step 4: API Gateway Setup

### 4.1 Upload API Gateway

1. **Create REST API via AWS Console:**
   - Name: `julia-cv-upload-api`
   - Type: REST API

2. **Create Resource and Method:**
   - Resource: `/upload`
   - Method: `POST`
   - Integration: Lambda Function (`JuliaBaucher_CV-upload-api`)

3. **Enable CORS:**
   - Access-Control-Allow-Origin: `https://juliabaucher.github.io`
   - Access-Control-Allow-Headers: `Content-Type,Authorization`
   - Access-Control-Allow-Methods: `POST,OPTIONS`

4. **Deploy API:**
   - Stage: `prod`
   - Note the API Gateway URL for use in admin.html

### 4.2 Update Existing Chat API (if needed)

Ensure the existing chat API at `https://cgwqo234y1.execute-api.eu-north-1.amazonaws.com/prod/chat` is configured to use the updated RAG Chat Lambda function.

## Step 5: Initial Knowledge Base Setup

### 5.1 Upload Sample Content via AWS Console

Upload the sample knowledge base file directly through AWS S3 Console:
1. Navigate to S3 bucket `juliabaucher-cv-kb`
2. Go to `kb/raw/` folder
3. Upload `julia-profile.md` file

This will automatically trigger the embedding builder Lambda function.

### 5.2 Verify Embeddings Generation

Check that embeddings are created:
1. Navigate to S3 bucket `juliabaucher-cv-kb`
2. Check `kb/embeddings/` folder
3. You should see `julia-profile.json` file created

## Step 6: Frontend Configuration

### 6.1 Update admin.html

Replace the placeholder URL in `admin.html`:
```javascript
const UPLOAD_API_URL = 'https://your-actual-api-gateway-url/prod/upload';
```

### 6.2 Test Admin Interface

1. Open `https://juliabaucher.github.io/admin.html`
2. Enter your admin token
3. Test uploading content
4. Verify files appear in S3 and embeddings are generated

## Step 7: Security Considerations

### 7.1 Admin Token Security
- Use a strong, randomly generated admin token
- Store securely and rotate regularly
- Consider using AWS Secrets Manager for production

### 7.2 CORS Configuration
- Ensure CORS is properly configured to only allow requests from `https://juliabaucher.github.io`
- Test that requests from other origins are blocked

### 7.3 S3 Bucket Security
- Verify bucket is not publicly accessible
- Use least-privilege IAM policies
- Enable CloudTrail logging for audit purposes

## Step 8: Monitoring and Logging

### 8.1 CloudWatch Logs
Monitor Lambda function logs for:
- Embedding generation success/failures
- Upload API authentication attempts
- RAG chat performance

### 8.2 CloudWatch Metrics
Set up alarms for:
- Lambda function errors
- API Gateway 4xx/5xx errors
- S3 upload failures

## Step 9: Testing the Complete System

### 9.1 End-to-End Test
1. Upload content via admin interface
2. Verify embeddings are generated
3. Test chatbot with questions about the uploaded content
4. Confirm RAG responses include relevant information

### 9.2 Performance Testing
- Test with larger knowledge base files
- Verify embedding generation completes within timeout
- Test chatbot response times

## Troubleshooting

### Common Issues

1. **Embeddings not generating:**
   - Check S3 trigger configuration
   - Verify OpenAI API key is valid
   - Check Lambda function logs

2. **Upload API authentication failures:**
   - Verify admin token matches environment variable
   - Check CORS configuration
   - Ensure proper Authorization header format

3. **RAG responses not using context:**
   - Verify embeddings exist in S3
   - Check similarity threshold settings
   - Review Lambda function logs for errors

### Useful AWS Console Navigation

```
# Check Lambda function logs
CloudWatch > Log groups > /aws/lambda/JuliaBaucher*

# List S3 bucket contents
S3 > juliabaucher-cv-kb > kb/

# Test Lambda function
Lambda > Function name > Test tab
```

## Cost Optimization

### Expected Costs
- S3 storage: ~$0.01/month for typical knowledge base size
- Lambda executions: ~$0.10/month for moderate usage
- API Gateway: ~$0.05/month for typical admin usage
- OpenAI API: Variable based on usage (~$0.01 per 1K tokens)

### Cost Reduction Tips
- Use S3 Intelligent Tiering for older embeddings
- Set appropriate Lambda memory allocation
- Monitor and optimize OpenAI API usage
- Use CloudWatch to identify unused resources

## Maintenance

### Regular Tasks
- Monitor Lambda function performance via AWS Console
- Review and rotate admin tokens
- Update knowledge base content as needed
- Monitor OpenAI API usage and costs

### Updates and Improvements
- Keep Lambda runtime and dependencies updated via AWS Console
- Review and optimize embedding chunking strategy
- Consider implementing caching for frequently accessed embeddings
- Monitor user feedback and adjust RAG parameters as needed