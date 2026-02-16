import os
import argparse
import httpx
import time
from pypdf import PdfReader
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("VITE_GEMINI_API_KEY")

# Initialize Gemini
genai.configure(api_key=GEMINI_API_KEY)

def extract_text_from_pdf(pdf_path):
    print(f"Reading PDF: {pdf_path}")
    if not os.path.exists(pdf_path):
        print(f"Error: File not found at {pdf_path}")
        return None
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None

def chunk_text(text, chunk_size=1000, overlap=200):
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def ingest_pdf(pdf_path):
    text = extract_text_from_pdf(pdf_path)
    if not text:
        return
        
    chunks = chunk_text(text)
    print(f"Generated {len(chunks)} chunks. Processing embeddings (gemini-embedding-001, 768 dims)...")
    
    api_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/school"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    with httpx.Client() as client:
        for i, chunk in enumerate(chunks):
            try:
                # Generate embedding
                result = genai.embed_content(
                    model="models/gemini-embedding-001",
                    content=chunk,
                    task_type="retrieval_document",
                    title="NC 3rd Grade Curriculum",
                    output_dimensionality=768
                )
                embedding = result['embedding']
                
                data = {
                    "content": chunk,
                    "embedding": embedding
                }
                
                # Insert via REST API
                response = client.post(api_url, json=data, headers=headers)
                if response.status_code >= 400:
                    if response.status_code == 429:
                        print(f"Rate limited on chunk {i}. Sleeping for 5s...")
                        time.sleep(5)
                        # Retry once
                        response = client.post(api_url, json=data, headers=headers)
                    
                    if response.status_code >= 400:
                        print(f"Error inserting chunk {i}: {response.status_code} - {response.text}")
                else:
                    if (i + 1) % 10 == 0 or (i + 1) == len(chunks):
                        print(f"Progress: {i+1}/{len(chunks)} chunks inserted.")
                
                # Small delay to avoid rate limits
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Error processing chunk {i}: {e}")
            
    print("\nIngestion complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest PDF into Supabase vectors using Gemini embeddings.")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    args = parser.parse_args()
    
    if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
        print("Error: Missing environment variables in .env file.")
    else:
        ingest_pdf(args.pdf_path)
