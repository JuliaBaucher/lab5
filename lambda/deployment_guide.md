# Lambda Deployment Guide for RAG-Enhanced Chatbot

This guide explains how to deploy the RAG-enhanced Lambda function for Julia's CV website chatbot.

## Prerequisites

- AWS CLI configured with appropriate permissions
- Python 3.9 or later
- Access to OpenAI API

## Deployment Steps

### 1. Prepare the Deployment Package

```bash
# Create a deployment directory
mkdir lambda-deployment
cd lambda-deployment

# Copy the Lambda function and data
cp ../lambda/lambda_function.py .
cp ../lambda/requirements.txt .
cp -r ../data .

# Install dependencies
pip install -r requirements.txt -t .

# Create the deployment package
zip -r lambda-deployment.zip .
```

### 2. Create/Update the Lambda Function

#### Option A: Create New Function
```bash
aws lambda create-function \
  --function-name julia-cv-chatbot-rag \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda-deployment.zip \
  --timeout 30 \
  --memory-size 512
```

#### Option B: Update Existing Function
```bash
aws lambda update-function-code \
  --function-name julia-cv-chatbot-rag \
  --zip-file fileb://lambda-deployment.zip
```

### 3. Set Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name julia-cv-chatbot-rag \
  --environment Variables='{OPENAI_API_KEY=your-openai-api-key-here}'
```

### 4. Configure API Gateway (if needed)

If you need to create a new API Gateway endpoint:

```bash
# Create API Gateway
aws apigateway create-rest-api --name julia-cv-chatbot-api

# Get the API ID from the response, then create resources and methods
# This is a simplified example - you may need additional configuration
```

### 5. Test the Deployment

Test the function with a sample payload:

```bash
aws lambda invoke \
  --function-name julia-cv-chatbot-rag \
  --payload '{"body": "{\"message\": \"What is Julia'\''s experience with machine learning?\"}"}' \
  response.json

cat response.json
```

## Required IAM Permissions

The Lambda execution role needs the following permissions:

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
        }
    ]
}
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)

## Function Configuration

- **Runtime**: Python 3.9
- **Memory**: 512 MB (recommended for embedding operations)
- **Timeout**: 30 seconds
- **Handler**: `lambda_function.lambda_handler`

## Monitoring and Troubleshooting

### CloudWatch Logs
Monitor the function execution through CloudWatch logs:
```bash
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/julia-cv-chatbot-rag
```

### Common Issues

1. **Import Errors**: Ensure all dependencies are included in the deployment package
2. **Timeout Errors**: Increase the timeout if embedding operations take too long
3. **Memory Errors**: Increase memory allocation if processing large knowledge bases
4. **API Key Errors**: Verify the OpenAI API key is correctly set in environment variables

## Updating the Knowledge Base

To update the knowledge base:

1. Modify `data/profile_knowledge.json`
2. Redeploy the Lambda function with the updated package
3. The embeddings will be recalculated on the first request after deployment

## Security Considerations

- Store the OpenAI API key in AWS Secrets Manager for enhanced security
- Enable AWS X-Ray tracing for better monitoring
- Consider implementing rate limiting to prevent abuse
- Use VPC configuration if additional network security is required

## Cost Optimization

- Monitor OpenAI API usage through their dashboard
- Consider caching embeddings in DynamoDB for frequently accessed content
- Implement request throttling to control costs
- Use provisioned concurrency only if needed for consistent performance