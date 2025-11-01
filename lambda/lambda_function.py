import json
import os
import logging
from typing import List, Dict, Any
import numpy as np
from openai import OpenAI

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Global variables for caching
knowledge_base = None
embeddings_cache = None

def load_knowledge_base() -> List[Dict[str, str]]:
    """Load the knowledge base from the JSON file."""
    global knowledge_base
    if knowledge_base is None:
        try:
            # In Lambda, the data file should be packaged with the deployment
            with open('data/profile_knowledge.json', 'r', encoding='utf-8') as f:
                knowledge_base = json.load(f)
            logger.info(f"Loaded {len(knowledge_base)} knowledge base entries")
        except FileNotFoundError:
            logger.error("Knowledge base file not found")
            knowledge_base = []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing knowledge base JSON: {e}")
            knowledge_base = []
    return knowledge_base

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings for a list of texts using OpenAI's embedding model."""
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=texts
        )
        return [embedding.embedding for embedding in response.data]
    except Exception as e:
        logger.error(f"Error getting embeddings: {e}")
        return []

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    try:
        a_np = np.array(a)
        b_np = np.array(b)
        return np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np))
    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {e}")
        return 0.0

def initialize_embeddings():
    """Initialize embeddings for the knowledge base."""
    global embeddings_cache
    if embeddings_cache is None:
        kb = load_knowledge_base()
        if kb:
            # Create embeddings for all knowledge base entries
            texts = [f"{entry['topic']}: {entry['content']}" for entry in kb]
            embeddings = get_embeddings(texts)
            if embeddings:
                embeddings_cache = embeddings
                logger.info("Embeddings initialized successfully")
            else:
                logger.error("Failed to create embeddings")
                embeddings_cache = []
        else:
            embeddings_cache = []

def retrieve_relevant_context(query: str, top_k: int = 3) -> List[Dict[str, str]]:
    """Retrieve the most relevant knowledge base entries for a given query."""
    kb = load_knowledge_base()
    if not kb or not embeddings_cache:
        return []
    
    try:
        # Get embedding for the query
        query_embedding = get_embeddings([query])
        if not query_embedding:
            return []
        
        query_emb = query_embedding[0]
        
        # Calculate similarities
        similarities = []
        for i, kb_embedding in enumerate(embeddings_cache):
            similarity = cosine_similarity(query_emb, kb_embedding)
            similarities.append((similarity, i))
        
        # Sort by similarity and get top_k
        similarities.sort(reverse=True, key=lambda x: x[0])
        top_indices = [idx for _, idx in similarities[:top_k]]
        
        # Return the most relevant entries
        relevant_entries = [kb[i] for i in top_indices]
        logger.info(f"Retrieved {len(relevant_entries)} relevant entries for query")
        return relevant_entries
        
    except Exception as e:
        logger.error(f"Error retrieving relevant context: {e}")
        return []

def generate_response(query: str, context: List[Dict[str, str]]) -> str:
    """Generate a response using OpenAI's chat completion with retrieved context."""
    try:
        # Build the context string
        context_str = ""
        if context:
            context_str = "\n\nRelevant information about Julia:\n"
            for entry in context:
                context_str += f"- {entry['topic']}: {entry['content']}\n"
        
        # Enhanced system prompt with retrieved context
        system_prompt = f"""You are Julia Baucher's AI assistant for recruiters and potential collaborators.
Speak as Julia: professional, concise, friendly. Use the provided context to give accurate, specific answers.

Key instructions:
- Answer based on the provided context when relevant
- If the context doesn't contain the answer, use your general knowledge about Julia from the CV
- Be conversational but professional
- Offer to provide more details or links when helpful
- Answer in the user's language when possible
- If unsure about specific details, acknowledge it honestly

{context_str}

Always prioritize accuracy over completeness. If you don't have specific information, say so rather than making assumptions."""

        # Create the chat completion
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return "I apologize, but I'm having trouble processing your request right now. Please try again later."

def lambda_handler(event, context):
    """Main Lambda handler function."""
    try:
        # Parse the request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        user_message = body.get('message', '').strip()
        
        if not user_message:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Message is required'})
            }
        
        # Initialize embeddings if not already done
        initialize_embeddings()
        
        # Retrieve relevant context
        relevant_context = retrieve_relevant_context(user_message)
        
        # Generate response with context
        response = generate_response(user_message, relevant_context)
        
        # Return the response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'reply': response,
                'context_used': len(relevant_context) > 0
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in lambda_handler: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

# Handle OPTIONS requests for CORS
def handle_options():
    """Handle CORS preflight requests."""
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': ''
    }