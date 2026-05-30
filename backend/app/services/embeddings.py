import uuid
import asyncio
import logging
from typing import List, Dict, Any

from langchain.text_splitter import RecursiveCharacterTextSplitter
import google.generativeai as genai

from app.core.config import settings
from app.core.qdrant_client import upsert_chunks

logger = logging.getLogger(__name__)

# Configure the Gemini API client securely via settings
genai.configure(api_key=settings.GEMINI_API_KEY)


def chunk_transcript(transcript: str, metadata: dict) -> List[Dict[str, Any]]:
    """
    Splits the full transcript into smaller chunks using LangChain's RecursiveCharacterTextSplitter.
    Why 512 with 64 overlap: fits Gemini embedding context (2048 token max), 
    overlap preserves sentence context across chunk boundaries.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,       # Default: 512
        chunk_overlap=settings.CHUNK_OVERLAP, # Default: 64
        separators=['\n\n', '\n', '. ', ' ', '']
    )
    
    texts = text_splitter.split_text(transcript)
    chunks = []
    
    for i, chunk_text in enumerate(texts):
        chunks.append({
            'text': chunk_text,
            'chunk_index': i,
            'total_chunks': len(texts),
            'session_id': metadata.get('session_id'),
            'video_label': metadata.get('video_label'),  # 'A' or 'B'
            'creator': metadata.get('creator'),
            'platform': metadata.get('platform'),
            'url': metadata.get('url'),
            'engagement_rate': metadata.get('engagement_rate'),
        })
        
    return chunks


def _embed_batch_sync(texts: List[str]) -> List[List[float]]:
    """
    Synchronous helper to call the Gemini API for embeddings.
    """
    result = genai.embed_content(
        model=f"models/{settings.EMBEDDING_MODEL}",
        content=texts,
        task_type="retrieval_document"
    )
    return result['embedding']


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a list of text strings using the Gemini embedding model.
    Processes in batches of 50 to respect API rate limits (1500 RPM free).
    """
    batch_size = 50
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        
        # Safely run it in a thread pool to avoid blocking FastAPI's event loop
        batch_embeddings = await asyncio.to_thread(_embed_batch_sync, batch)
        all_embeddings.extend(batch_embeddings)
        
        # Space out requests slightly between batches
        if i + batch_size < len(texts):
            await asyncio.sleep(0.1)
            
    return all_embeddings


async def embed_and_store_chunks(chunks: List[Dict[str, Any]]) -> int:
    """
    Extracts text from chunks, generates their embeddings via Gemini API,
    builds the Qdrant point objects, and upserts them into the Qdrant DB.
    """
    if not chunks:
        return 0
        
    texts = [chunk['text'] for chunk in chunks]
    embeddings = await embed_texts(texts)
    
    points = []
    for chunk, vector in zip(chunks, embeddings):
        points.append({
            "id": str(uuid.uuid4()),
            "vector": vector,
            "payload": chunk
        })
        
    # upsert_chunks is synchronous, so we run it in a thread pool
    count_stored = await asyncio.to_thread(upsert_chunks, points)
    return count_stored
