#!/usr/bin/env python3
"""
Test script for the RAG-enhanced Lambda function.
This script allows you to test the RAG functionality locally before deployment.
"""

import json
import os
import sys
from lambda_function import lambda_handler

def test_rag_functionality():
    """Test the RAG functionality with sample queries."""
    
    # Set up environment variable for testing (replace with your actual API key)
    if not os.environ.get('OPENAI_API_KEY'):
        print("Warning: OPENAI_API_KEY environment variable not set.")
        print("Set it with: export OPENAI_API_KEY='your-api-key-here'")
        return
    
    # Test queries
    test_queries = [
        "What is Julia's experience with machine learning?",
        "What projects has Julia worked on at Amazon?",
        "What programming languages does Julia know?",
        "Where did Julia study?",
        "What awards has Julia received?",
        "Tell me about Julia's consulting experience.",
        "What is Julia's background in product management?"
    ]
    
    print("Testing RAG-enhanced Lambda function...")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Query: {query}")
        print("-" * 40)
        
        # Create test event
        event = {
            'body': json.dumps({'message': query})
        }
        
        try:
            # Call the Lambda handler
            response = lambda_handler(event, None)
            
            # Parse the response
            if response['statusCode'] == 200:
                body = json.loads(response['body'])
                reply = body.get('reply', 'No reply found')
                context_used = body.get('context_used', False)
                
                print(f"Response: {reply}")
                print(f"Context used: {'Yes' if context_used else 'No'}")
            else:
                print(f"Error: {response}")
                
        except Exception as e:
            print(f"Error testing query: {e}")
    
    print("\n" + "=" * 50)
    print("Testing completed!")

def test_knowledge_base_loading():
    """Test if the knowledge base loads correctly."""
    try:
        from lambda_function import load_knowledge_base
        kb = load_knowledge_base()
        print(f"Knowledge base loaded successfully with {len(kb)} entries:")
        for entry in kb[:3]:  # Show first 3 entries
            print(f"- {entry['topic']}")
        if len(kb) > 3:
            print(f"... and {len(kb) - 3} more entries")
    except Exception as e:
        print(f"Error loading knowledge base: {e}")

def test_embeddings():
    """Test if embeddings can be generated."""
    try:
        from lambda_function import get_embeddings
        test_texts = ["Julia is a product manager", "She works at Amazon"]
        embeddings = get_embeddings(test_texts)
        if embeddings:
            print(f"Embeddings generated successfully. Dimension: {len(embeddings[0])}")
        else:
            print("Failed to generate embeddings")
    except Exception as e:
        print(f"Error testing embeddings: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "kb":
            test_knowledge_base_loading()
        elif sys.argv[1] == "embeddings":
            test_embeddings()
        else:
            print("Usage: python test_rag.py [kb|embeddings]")
            print("  kb: Test knowledge base loading")
            print("  embeddings: Test embedding generation")
            print("  (no args): Run full RAG test")
    else:
        test_rag_functionality()