# Julia Baucher - CV Website with RAG-Enhanced Chatbot

This repository hosts Julia Baucher's personal CV website as a static site with an AI-powered chatbot that uses Retrieval-Augmented Generation (RAG) to provide accurate, contextual answers about her experience, skills, and background.

## 🚀 Features

- **Static CV Website**: Clean, responsive design showcasing professional experience
- **Multilingual Support**: Available in English and French
- **RAG-Enhanced Chatbot**: AI assistant that retrieves relevant information from a knowledge base
- **Secure Backend**: AWS Lambda integration with secure OpenAI API key management
- **Mobile-Friendly**: Responsive design that works on all devices

## 🏗️ Architecture

### Frontend (`index.html`)
- Static HTML/CSS/JavaScript website
- Embedded chatbot UI with accessibility features
- Hosted on GitHub Pages
- Calls AWS Lambda backend for AI responses

### Backend (`/lambda/`)
- **RAG Implementation**: Retrieval-Augmented Generation using OpenAI embeddings
- **Knowledge Base**: Structured information about Julia's experience (`/data/profile_knowledge.json`)
- **Vector Search**: Cosine similarity search for relevant context retrieval
- **OpenAI Integration**: Uses `text-embedding-3-small` for embeddings and `gpt-4o-mini` for responses

### Knowledge Base (`/data/`)
- `profile_knowledge.json`: Comprehensive information about Julia's experience, skills, and background
- Easily editable and expandable format
- Covers work experience, education, awards, technical skills, and more

## 🤖 RAG Implementation

The chatbot uses Retrieval-Augmented Generation to provide accurate, contextual responses:

1. **Query Processing**: User questions are embedded using OpenAI's embedding model
2. **Context Retrieval**: Most relevant knowledge base entries are found using cosine similarity
3. **Response Generation**: Retrieved context is included in the prompt to OpenAI's chat model
4. **Grounded Answers**: Responses are based on actual information from Julia's profile

### Example Queries the Chatbot Can Answer:
- "What projects has Julia worked on at Amazon?"
- "What's Julia's background in AI and machine learning?"
- "Where is Julia based and what languages does she speak?"
- "What awards has Julia received?"
- "What technical skills does Julia have?"

## 📁 Project Structure

```
/
├── index.html                          # Main CV website
├── data/
│   └── profile_knowledge.json          # Knowledge base for RAG
├── lambda/
│   ├── lambda_function.py              # RAG-enhanced Lambda function
│   ├── requirements.txt                # Python dependencies
│   └── deployment_guide.md             # Deployment instructions
└── README.md                           # This file
```

## 🚀 Deployment

### Frontend Deployment
The frontend is automatically deployed via GitHub Pages when changes are pushed to the main branch.

### Backend Deployment
Follow the detailed instructions in [`lambda/deployment_guide.md`](lambda/deployment_guide.md) to deploy the RAG-enhanced Lambda function.

#### Quick Setup:
1. **Prepare the deployment package**:
   ```bash
   cd lambda
   pip install -r requirements.txt -t .
   zip -r lambda-deployment.zip . ../data/
   ```

2. **Deploy to AWS Lambda**:
   ```bash
   aws lambda update-function-code \
     --function-name your-function-name \
     --zip-file fileb://lambda-deployment.zip
   ```

3. **Set environment variables**:
   ```bash
   aws lambda update-function-configuration \
     --function-name your-function-name \
     --environment Variables='{OPENAI_API_KEY=your-api-key}'
   ```

## 🔧 Configuration

### Environment Variables (Lambda)
- `OPENAI_API_KEY`: Your OpenAI API key (required)

### Frontend Configuration
Update the API endpoint in `index.html` if needed:
```javascript
const r = await fetch('YOUR_LAMBDA_API_ENDPOINT', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userText })
});
```

## 📝 Updating the Knowledge Base

To add or modify information about Julia:

1. Edit `data/profile_knowledge.json`
2. Add new entries following the existing format:
   ```json
   {
     "topic": "New Topic",
     "content": "Detailed information about this topic..."
   }
   ```
3. Redeploy the Lambda function
4. Embeddings will be recalculated automatically on the first request

## 🛠️ Development

### Local Testing
To test the Lambda function locally:

```python
# Test the RAG functionality
from lambda_function import lambda_handler

event = {
    'body': '{"message": "What is Julia\'s experience with Python?"}'
}
result = lambda_handler(event, None)
print(result)
```

### Dependencies
- **Frontend**: Pure HTML/CSS/JavaScript (no build process required)
- **Backend**: Python 3.9+, OpenAI API, NumPy

## 🔒 Security Features

- OpenAI API key stored securely in Lambda environment variables
- CORS properly configured for cross-origin requests
- Rate limiting implemented to prevent abuse
- No sensitive information exposed in frontend code

## 📊 Monitoring

- CloudWatch logs for Lambda function monitoring
- OpenAI API usage tracking through OpenAI dashboard
- Error handling and graceful degradation

## 🤝 Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for personal use. Please contact Julia Baucher for any usage permissions.

## 📞 Contact

- **Email**: juliabaucher.work@gmail.com
- **LinkedIn**: [linkedin.com/in/juliabaucher](https://linkedin.com/in/juliabaucher)
- **Website**: [juliabaucher.github.io](https://juliabaucher.github.io)

---

*This CV website demonstrates modern web development practices with AI integration, showcasing both technical skills and professional experience.*