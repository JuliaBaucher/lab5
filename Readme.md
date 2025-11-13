# Julia Baucher – AI CV Chatbot with RAG

This project provides an interactive AI assistant that answers questions about Julia’s professional background.  

The chatbot combines two layers: (1) a system prompt that defines tone and behavior, and (2) a RAG (Retrieval-Augmented Generation) step that searches Julia’s uploaded knowledge documents in S3 and injects the most relevant excerpts into the model prompt. 
The system prompt controls how the chatbot speaks, while the RAG layer ensures the answers are grounded in Julia’s real experience rather than guessed or hallucinated.


The chatbot is embedded on the public CV website:

👉 https://juliabaucher.github.io/lab5/

---

## ✨ Core Features

| Feature | Description |
|--------|-------------|
| **Conversational Chatbot** | AI chat powered by GPT-4o-mini |
| **RAG Knowledge Retrieval** | Answers come from uploaded documents |
| **Secure Admin Upload Panel** | Admin can update Julia’s background anytime |
| **Automatic Embedding Generation** | Text is chunked + embedded via OpenAI |
| **Fully Serverless** | No backend servers, auto-scale, low cost |
| **Public Website Hosted on GitHub Pages** | Zero hosting maintenance |

---

## 🏛 System Architecture Overview

GitHub Pages (Website UI)
│
│ POST /chat
▼
API Gateway (Public Chat API)
▼
Lambda: juliaBaucher_CV-backend-RAG
│
│ Loads embeddings from S3
│ Selects best matches using cosine similarity
│
▼
S3 Bucket (Knowledge Base)
• kb/raw/.md (uploaded documents)
• kb/embeddings/.json (vector embeddings)
│
▼
OpenAI GPT-4o-mini


### Admin Knowledge Upload Flow

admin.html
│ POST /upload (Authorization: Bearer ADMIN_TOKEN)
▼
API Gateway (Admin API)
▼
Lambda: juliaBaucher_CV-adminupload
▼
S3: kb/raw/.md
▼ (S3 Event Trigger)
Lambda: juliaBaucher_CV-EmbeddingBuilder
▼
Writes kb/embeddings/.json


---

## 🗃 S3 Folder Structure
juliabaucher-cv-kb/
│
├── kb/
│ ├── raw/ <- Uploaded markdown/text files
│ └── embeddings/ <- Generated embedding JSON files


---

## 🔐 Environment Variables

| Lambda Function | Variable | Description |
|-----------------|----------|-------------|
| backend-RAG     | `OPENAI_API_KEY` | API key for GPT / embeddings |
| backend-RAG     | `BUCKET` | S3 bucket name (`juliabaucher-cv-kb`) |
| adminupload     | `ADMIN_TOKEN` | Password required for uploads |
| embeddingbuilder| `OPENAI_API_KEY` | Needed to generate embeddings |

---

## 📝 Updating the Knowledge Base

1. Visit **admin.html**
2. Enter a filename (example: `julia_background.md`)
3. Paste or type content
4. Enter **Admin Token**
5. Click **Save**

The system automatically:
- uploads the file → triggers the embedding builder → updates chatbot context

**No redeployment required.**

---

## 🌐 Frontend Files

| File | Purpose |
|------|---------|
| `lab5/index.html` | Chat UI |
| `lab5/admin.html` | Secure KB upload UI |

Hosted via GitHub Pages:

https://juliabaucher.github.io/lab5/



---

## 🧠 Tech Stack

| Layer | Technology |
|------|------------|
| Hosting | GitHub Pages |
| Backend Compute | AWS Lambda (Node & Python) |
| API Routing | AWS API Gateway |
| Storage | Amazon S3 |
| AI Models | `gpt-4o-mini`, `text-embedding-3-small` |

---

             +------------------------------+
             |       GitHub Pages UI        |
             |  (chat.html / admin.html)    |
             +------------------------------+
                         |
                         | HTTPS
                         |
             +------------------------------+
             |        API Gateway           |
             |  /chat       /upload         |
             +------------------------------+
                 |               |
                 |               | (Bearer token required)
                 |               ▼
                 |        +--------------------------+
                 |        | juliaBaucher_CV-AdminUpload |
                 |        +--------------------------+
                 |                     |
                 |                     ▼
                 |              S3: kb/raw/*.md
                 |                     |
                 |                     ▼   (S3 trigger)
                 |        +---------------------------+
                 |        | juliaBaucher_CV-EmbeddingBuilder |
                 |        +---------------------------+
                 |                     |
                 |                     ▼
                 |             S3: kb/embeddings/*.json
                 |
                 ▼
       +------------------------------+
       | juliaBaucher_CV-backend-RAG |
       |  - Loads embeddings         |
       |  - Cosine similarity search |
       +------------------------------+
                         |
                         ▼
                 +---------------+
                 | GPT-4o-mini   |
                 +---------------+




## 📌 Roadmap / Future Improvements

- Add edit/delete controls in admin UI
- Add usage analytics / FAQs dashboard
- Allow PDF uploads with automatic text extraction
- Add fallback LM summarization for chunked answers

---



