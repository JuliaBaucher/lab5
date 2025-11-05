# Deployment Checklist for RAG + Editable Knowledge Base

Use this checklist to ensure all components are properly deployed and configured.

## ✅ Pre-Deployment Setup

### AWS Account Preparation
- [ ] AWS Account with appropriate permissions
- [ ] AWS CLI installed and configured
- [ ] OpenAI API key obtained
- [ ] Admin token generated (strong, random string)

### Repository Setup
- [ ] Code repository cloned locally
- [ ] All Lambda function dependencies reviewed
- [ ] API endpoints identified for configuration

## ✅ S3 Bucket Configuration

### Bucket Creation
- [ ] S3 bucket `juliabaucher-cv-kb` created in `eu-north-1`
- [ ] Block Public Access enabled (all 4 settings)
- [ ] Versioning enabled
- [ ] Server-side encryption enabled

### Folder Structure
- [ ] `kb/raw/` folder created
- [ ] `kb/embeddings/` folder created
- [ ] Sample content uploaded to `kb/raw/julia-profile.md`

## ✅ IAM Roles and Policies

### Embedding Builder Lambda Role
- [ ] Role `EmbeddingBuilderLambdaRole` created
- [ ] Trust policy configured for Lambda service
- [ ] Permissions policy allows:
  - [ ] CloudWatch Logs access
  - [ ] S3 GetObject on `kb/raw/*`
  - [ ] S3 PutObject on `kb/embeddings/*`

### Upload API Lambda Role
- [ ] Role `UploadAPILambdaRole` created
- [ ] Trust policy configured for Lambda service
- [ ] Permissions policy allows:
  - [ ] CloudWatch Logs access
  - [ ] S3 PutObject on `kb/raw/*`

### RAG Chat Lambda Role
- [ ] Role `RAGChatLambdaRole` created
- [ ] Trust policy configured for Lambda service
- [ ] Permissions policy allows:
  - [ ] CloudWatch Logs access
  - [ ] S3 GetObject and ListBucket on `kb/embeddings/*`

## ✅ Lambda Functions Deployment

### Embedding Builder Lambda
- [ ] Function `JuliaBaucher_CV-embedding-builder` created
- [ ] Runtime: Node.js 18.x
- [ ] Role: `EmbeddingBuilderLambdaRole`
- [ ] Timeout: 5 minutes (300 seconds)
- [ ] Memory: 512 MB
- [ ] Environment variable `OPENAI_API_KEY` set
- [ ] Code deployed from `lambda/embedding-builder/`
- [ ] Dependencies installed (`npm install`)
- [ ] S3 trigger configured:
  - [ ] Event: `s3:ObjectCreated:*`
  - [ ] Bucket: `juliabaucher-cv-kb`
  - [ ] Prefix: `kb/raw/`
  - [ ] Suffix: `.md`

### Upload API Lambda
- [ ] Function `JuliaBaucher_CV-upload-api` created
- [ ] Runtime: Node.js 18.x
- [ ] Role: `UploadAPILambdaRole`
- [ ] Timeout: 30 seconds
- [ ] Memory: 256 MB
- [ ] Environment variable `ADMIN_TOKEN` set
- [ ] Code deployed from `lambda/upload-api/`
- [ ] Dependencies installed (`npm install`)

### RAG Chat Lambda
- [ ] Existing function `JuliaBaucher_CV-backend-RAG` updated
- [ ] Runtime: Node.js 18.x
- [ ] Role: `RAGChatLambdaRole`
- [ ] Timeout: 30 seconds
- [ ] Memory: 512 MB
- [ ] Environment variable `OPENAI_API_KEY` set
- [ ] Code deployed from `lambda/rag-chat/`
- [ ] Dependencies installed (`npm install`)

## ✅ API Gateway Configuration

### Upload API Gateway
- [ ] REST API `julia-cv-upload-api` created
- [ ] Resource `/upload` created
- [ ] Method `POST` configured
- [ ] Lambda integration with `JuliaBaucher_CV-upload-api`
- [ ] CORS enabled:
  - [ ] Access-Control-Allow-Origin: `https://juliabaucher.github.io`
  - [ ] Access-Control-Allow-Headers: `Content-Type,Authorization`
  - [ ] Access-Control-Allow-Methods: `POST,OPTIONS`
- [ ] API deployed to `prod` stage
- [ ] API Gateway URL noted for frontend configuration

### Chat API Gateway (Existing)
- [ ] Existing chat API confirmed working
- [ ] URL: `https://cgwqo234y1.execute-api.eu-north-1.amazonaws.com/prod/chat`
- [ ] Integration updated to use new RAG Chat Lambda

## ✅ Frontend Configuration

### Admin Interface
- [ ] `admin.html` updated with correct Upload API Gateway URL
- [ ] CORS origin matches deployed domain
- [ ] Admin interface accessible at `/admin.html`

### Main Website
- [ ] Existing chatbot integration confirmed working
- [ ] Chat API endpoint correct
- [ ] No changes needed to main website functionality

## ✅ Testing and Validation

### Initial Content Upload
- [ ] Sample content uploaded via AWS CLI or admin interface
- [ ] Embedding generation triggered automatically
- [ ] Embeddings file created in `kb/embeddings/`
- [ ] CloudWatch logs show successful processing

### Admin Interface Testing
- [ ] Admin page loads correctly
- [ ] Authentication with admin token works
- [ ] Content upload functionality works
- [ ] Error handling displays appropriate messages
- [ ] Success messages appear after upload

### Chatbot Testing
- [ ] Chatbot opens and displays correctly
- [ ] Basic questions receive responses
- [ ] RAG-enhanced responses include relevant context
- [ ] Responses reference uploaded knowledge base content
- [ ] Error handling works for API failures

### End-to-End Testing
- [ ] Upload new content via admin interface
- [ ] Wait for embedding generation (check CloudWatch logs)
- [ ] Test chatbot with questions about new content
- [ ] Verify responses include new information

## ✅ Security Validation

### Access Control
- [ ] S3 bucket is not publicly accessible
- [ ] Admin API requires valid token
- [ ] CORS blocks unauthorized origins
- [ ] Lambda functions have minimal required permissions

### Authentication Testing
- [ ] Admin interface rejects invalid tokens
- [ ] Admin interface accepts valid tokens
- [ ] API returns 401 for missing/invalid authorization
- [ ] API returns 403 for unauthorized origins

## ✅ Monitoring and Logging

### CloudWatch Setup
- [ ] Lambda function logs are being created
- [ ] Log retention period set appropriately
- [ ] Error logs are readable and informative
- [ ] Performance metrics are being collected

### Monitoring Alerts (Optional)
- [ ] CloudWatch alarms for Lambda errors
- [ ] CloudWatch alarms for API Gateway errors
- [ ] Cost monitoring alerts set up

## ✅ Performance Optimization

### Lambda Configuration
- [ ] Memory allocation optimized for each function
- [ ] Timeout values appropriate for function complexity
- [ ] Environment variables properly configured
- [ ] Dependencies minimized in deployment packages

### Caching
- [ ] Embedding cache implemented in RAG Chat Lambda
- [ ] Cache TTL configured appropriately
- [ ] Cache invalidation working correctly

## ✅ Documentation and Maintenance

### Documentation
- [ ] AWS setup guide reviewed and accurate
- [ ] README.md updated with new features
- [ ] Deployment checklist completed
- [ ] API endpoints documented

### Backup and Recovery
- [ ] S3 versioning enabled for knowledge base files
- [ ] Lambda function code backed up in repository
- [ ] Environment variables documented securely
- [ ] Recovery procedures documented

## ✅ Go-Live Checklist

### Final Validation
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Documentation complete

### Launch Preparation
- [ ] Admin token shared securely with Julia
- [ ] Usage instructions provided
- [ ] Support contact information available
- [ ] Rollback plan prepared if needed

## 🚨 Troubleshooting Quick Reference

### Common Issues and Solutions

**Embeddings not generating:**
- Check S3 trigger configuration
- Verify OpenAI API key in environment variables
- Review Lambda function logs in CloudWatch

**Admin upload failing:**
- Verify admin token matches environment variable
- Check CORS configuration in API Gateway
- Ensure proper Authorization header format

**Chatbot not using new content:**
- Confirm embeddings were generated successfully
- Check embedding cache TTL in RAG Lambda
- Verify S3 permissions for RAG Lambda

**API Gateway errors:**
- Check Lambda function logs for errors
- Verify CORS configuration
- Test Lambda function directly

### Useful Commands

```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/JuliaBaucher"

# List S3 contents
aws s3 ls s3://juliabaucher-cv-kb/kb/ --recursive

# Test Lambda function
aws lambda invoke --function-name JuliaBaucher_CV-upload-api --payload '{}' response.json

# Check API Gateway
curl -X OPTIONS https://your-api-gateway-url/prod/upload
```

## ✅ Post-Deployment Tasks

### Week 1
- [ ] Monitor usage and performance
- [ ] Collect user feedback
- [ ] Review CloudWatch logs for issues
- [ ] Optimize based on actual usage patterns

### Month 1
- [ ] Review costs and optimize if needed
- [ ] Update knowledge base content as needed
- [ ] Consider additional features based on usage
- [ ] Update documentation based on experience

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Verified By:** ___________  
**Notes:** ___________