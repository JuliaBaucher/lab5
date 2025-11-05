# Julia Baucher - CV Website with RAG-Enabled Chatbot

A modern, responsive CV website with an AI-powered chatbot that uses Retrieval-Augmented Generation (RAG) to provide accurate information about Julia's professional background.

## 🌟 Features

### Core Website
- **Responsive Design**: Modern, professional layout that works on all devices
- **Multilingual Support**: Available in English and French with persistent language preference
- **Print-Friendly**: Optimized for PDF generation and printing
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

### AI-Powered Chatbot
- **RAG Integration**: Uses embeddings and vector similarity search for accurate responses
- **Real-time Chat**: Instant responses powered by OpenAI GPT-4o-mini
- **Context-Aware**: Provides relevant information based on Julia's actual experience
- **Multilingual**: Responds in the user's preferred language

### Admin Knowledge Base Management
- **No-Code Updates**: Simple web interface for updating knowledge base content
- **Automatic Processing**: Content is automatically chunked and embedded
- **Secure Access**: Token-based authentication for admin operations
- **Real-time Updates**: Changes reflect in the chatbot within minutes

## 🏗️ Architecture

```
GitHub Pages (Static Site)
    ↓
Admin Interface → Upload API Lambda → S3 (Raw Content)
                                         ↓ (Auto-trigger)
                                   Embedding Builder Lambda
                                         ↓
                                   S3 (Embeddings)
                                         ↑
Website Chatbot → RAG Chat Lambda ←────┘
```

## 🚀 Live Demo

- **Main Website**: [https://juliabaucher.github.io/](https://juliabaucher.github.io/)
- **Admin Interface**: [https://juliabaucher.github.io/admin.html](https://juliabaucher.github.io/admin.html)

## 📁 Project Structure

```
/
├── index.html              # Main CV website
├── admin.html              # Knowledge base admin interface
├── lambda/                 # AWS Lambda functions
│   ├── embedding-builder/  # Processes uploads and generates embeddings
│   ├── upload-api/         # Handles admin uploads to S3
│   └── rag-chat/          # RAG-enabled chat responses
├── kb/                    # Knowledge base
│   └── raw/               # Sample markdown content
├── docs/                  # Documentation
│   └── aws-setup.md       # Detailed AWS deployment guide
└── README.md              # This file
```

## 🛠️ Technology Stack

### Frontend
- **HTML5/CSS3**: Modern web standards with CSS Grid and Flexbox
- **Vanilla JavaScript**: No frameworks, optimized for performance
- **Inter Font**: Professional typography from Google Fonts

### Backend (AWS)
- **Lambda Functions**: Node.js 18.x serverless functions
- **S3**: Secure storage for knowledge base and embeddings
- **API Gateway**: RESTful APIs with CORS configuration
- **IAM**: Fine-grained security policies

### AI/ML
- **OpenAI GPT-4o-mini**: Chat completions for natural responses
- **OpenAI text-embedding-3-small**: Vector embeddings for semantic search
- **Cosine Similarity**: Vector similarity matching for relevant context

## 🔧 Setup and Deployment

### Prerequisites
- AWS Account with appropriate permissions
- OpenAI API key
- Basic familiarity with AWS services

### Quick Start
1. **Clone the repository**
   ```bash
   git clone https://github.com/JuliaBaucher/lab5.git
   cd lab5
   ```

2. **Deploy AWS Infrastructure**
   Follow the detailed guide in [`docs/aws-setup.md`](docs/aws-setup.md)

3. **Configure Frontend**
   Update API endpoints in `admin.html` with your actual AWS API Gateway URLs

4. **Upload Initial Content**
   Use the admin interface or AWS CLI to upload knowledge base content

### Detailed Setup
See [`docs/aws-setup.md`](docs/aws-setup.md) for comprehensive deployment instructions including:
- S3 bucket configuration
- IAM roles and policies
- Lambda function deployment
- API Gateway setup
- Security configuration

## 📝 Usage

### For Visitors
1. Visit the main website to view Julia's CV
2. Click the chat button to ask questions about her experience
3. The AI assistant provides accurate, context-aware responses

### For Admin (Julia)
1. Visit `/admin.html`
2. Enter your admin token
3. Add or update knowledge base content
4. Changes automatically update the chatbot's knowledge

### Sample Questions for the Chatbot
- "What did Julia do at Amazon?"
- "Tell me about Julia's experience with machine learning"
- "What programming languages does Julia know?"
- "Where is Julia based?"
- "What is Julia's educational background?"

## 🔒 Security Features

- **Private S3 Bucket**: All data stored securely with no public access
- **Token Authentication**: Admin operations require secure token
- **CORS Protection**: APIs only accept requests from authorized domains
- **Input Validation**: All user inputs are sanitized and validated
- **Rate Limiting**: Built-in protection against abuse

## 🎯 Key Benefits

### For Julia
- **No Technical Maintenance**: Update content through simple web interface
- **Always Current**: Information stays up-to-date without code changes
- **Professional Presentation**: Modern, responsive design
- **Analytics Ready**: Easy to add tracking and analytics

### For Recruiters/Visitors
- **Interactive Experience**: Get specific information through natural conversation
- **Comprehensive Information**: Access to detailed professional background
- **Mobile Friendly**: Works perfectly on all devices
- **Fast Loading**: Optimized for performance

## 🔄 Continuous Improvement

The system is designed for easy updates and improvements:
- **Content Updates**: No code deployment needed
- **Feature Additions**: Modular architecture supports new capabilities
- **Performance Monitoring**: CloudWatch integration for insights
- **Cost Optimization**: Serverless architecture scales with usage

## 📊 Performance

- **Website Load Time**: < 2 seconds
- **Chatbot Response Time**: < 3 seconds average
- **Embedding Generation**: < 30 seconds for typical documents
- **Monthly AWS Costs**: < $5 for moderate usage

## 🤝 Contributing

This is a personal CV website, but suggestions and improvements are welcome:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Contact

**Julia Baucher**
- Email: juliabaucher.work@gmail.com
- LinkedIn: [linkedin.com/in/juliabaucher](https://linkedin.com/in/juliabaucher)
- Website: [juliabaucher.github.io](https://juliabaucher.github.io/)

---

*Built with ❤️ using modern web technologies and AI*