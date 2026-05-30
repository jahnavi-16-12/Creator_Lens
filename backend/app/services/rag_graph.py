import re
import json
import asyncio
from typing import TypedDict, Optional, Annotated, AsyncGenerator

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.core.supabase_client import get_session_metadata
from app.core.qdrant_client import search_chunks
from app.services.embeddings import embed_texts


class RAGState(TypedDict):
    session_id: str
    thread_id: str
    messages: Annotated[list, add_messages]  # LangGraph managed history
    query: str
    query_type: str        # 'comparison'|'metadata'|'suggestion'|'engagement'|'general'
    use_complex_model: bool
    retrieved_chunks: list[dict]
    video_metadata: dict   # {A: {...}, B: {...}} from Supabase
    response: str
    citations: list[dict]  # [{video_label, chunk_index, snippet}]


async def classify_query(state: RAGState) -> dict:
    """
    Classifies the user query into a type and determines if a complex model is needed.
    """
    # Use cheapest model for classification
    model = ChatGoogleGenerativeAI(model=settings.LLM_LITE_MODEL, temperature=0)
    
    prompt = f"""Classify the query into one type. 
Types: 'comparison', 'metadata', 'suggestion', 'engagement', 'general'.
Output JSON only: {{"type": "...", "use_complex": bool}}
Rule: set use_complex=True for 'comparison' and 'suggestion'.

Query: {state['query']}
"""
    response = await model.ainvoke([HumanMessage(content=prompt)])
    
    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0].strip()
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0].strip()
            
        data = json.loads(content)
        query_type = data.get('type', 'general')
        use_complex_model = bool(data.get('use_complex', False))
    except Exception:
        # Fallback in case of parsing failure
        query_type = 'general'
        use_complex_model = False
        
    return {"query_type": query_type, "use_complex_model": use_complex_model}


async def fetch_metadata(state: RAGState) -> dict:
    """
    Fetches session metadata from Supabase and restructures it by video_label.
    """
    metadata_list = await get_session_metadata(state['session_id'])
    video_metadata = {}
    
    for item in metadata_list:
        label = item.get('video_label')
        if label:
            video_metadata[label] = item
            
    return {"video_metadata": video_metadata}


async def retrieve_context(state: RAGState) -> dict:
    """
    Retrieves the most relevant chunks from Qdrant using the query embedding.
    """
    query = state['query']
    vectors = await embed_texts([query])
    query_vector = vectors[0]
    
    retrieved_chunks = []
    session_id = state['session_id']
    
    if state.get('query_type') == 'comparison':
        # Fetch top 4 from Video A AND top 4 from Video B separately
        chunks_a = await asyncio.to_thread(search_chunks, query_vector, session_id, 4, 'A')
        chunks_b = await asyncio.to_thread(search_chunks, query_vector, session_id, 4, 'B')
        retrieved_chunks.extend(chunks_a)
        retrieved_chunks.extend(chunks_b)
    else:
        # Fetch top 6 without label filter
        retrieved_chunks = await asyncio.to_thread(search_chunks, query_vector, session_id, 6)
        
    return {"retrieved_chunks": retrieved_chunks}


async def generate_response(state: RAGState) -> dict:
    """
    Generates the final response using the appropriate model based on query complexity.
    """
    model_name = settings.LLM_MODEL if state.get('use_complex_model') else settings.LLM_LITE_MODEL
    model = ChatGoogleGenerativeAI(model=model_name, streaming=True, temperature=0.2)
    
    system_prompt = """You are a video analytics expert helping creators improve performance.
Always cite sources as [Video A - Chunk N] or [Video B - Chunk N].
Base answers only on the provided context and metadata."""

    # Build Context from Metadata and Chunks
    context_str = "Video Metadata:\n"
    for label, meta in state.get('video_metadata', {}).items():
        # Exclude massive fields if they exist, but general metadata is fine
        context_str += f"Video {label}: {json.dumps(meta, default=str)}\n"
        
    context_str += "\nRetrieved Context:\n"
    for chunk in state.get('retrieved_chunks', []):
        label = chunk.get('video_label', 'Unknown')
        idx = chunk.get('chunk_index', 0)
        text = chunk.get('text', '')
        context_str += f"[Video {label} - Chunk {idx}]\n{text}\n\n"
        
    user_prompt = f"{context_str}\nCurrent Query: {state['query']}"
    
    # We replace the last message (the raw query) with the augmented prompt
    # so the model receives the context without duplicating history
    messages = [SystemMessage(content=system_prompt)]
    if len(state['messages']) > 1:
        messages.extend(state['messages'][:-1])
    messages.append(HumanMessage(content=user_prompt))
    
    response_msg = await model.ainvoke(messages)
    
    # We return the response string and update the message history with the AI message
    return {
        "response": response_msg.content,
        "messages": [response_msg]
    }


async def extract_citations(state: RAGState) -> dict:
    """
    Extracts citations from the response and maps them to snippets from retrieved_chunks.
    """
    response_text = state.get('response', '')
    citations = []
    
    # Find patterns like [Video A - Chunk 3] or [Video B - Chunk 1]
    pattern = r"\[Video\s+([A-B])\s*-\s*Chunk\s+(\d+)\]"
    matches = re.findall(pattern, response_text, re.IGNORECASE)
    
    seen = set()
    for label, chunk_idx in matches:
        key = f"{label.upper()}-{chunk_idx}"
        if key in seen:
            continue
        seen.add(key)
        
        # Match with actual retrieved chunks
        for chunk in state.get('retrieved_chunks', []):
            chunk_label = str(chunk.get('video_label', '')).upper()
            chunk_i = str(chunk.get('chunk_index', ''))
            if chunk_label == label.upper() and chunk_i == str(chunk_idx):
                citations.append({
                    'video_label': chunk.get('video_label'),
                    'chunk_index': chunk.get('chunk_index'),
                    'snippet': chunk.get('text', '')[:100]
                })
                break
                
    return {"citations": citations}


# ---------------------------------------------------------
# Graph Assembly
# ---------------------------------------------------------

graph = StateGraph(RAGState)

graph.add_node('classify', classify_query)
graph.add_node('fetch_metadata', fetch_metadata)
graph.add_node('retrieve', retrieve_context)
graph.add_node('generate', generate_response)
graph.add_node('cite', extract_citations)

graph.set_entry_point('classify')
graph.add_edge('classify', 'fetch_metadata')
graph.add_edge('fetch_metadata', 'retrieve')
graph.add_edge('retrieve', 'generate')
graph.add_edge('generate', 'cite')
graph.add_edge('cite', END)

# Compile graph with MemorySaver for session/thread check-pointing
app = graph.compile(checkpointer=MemorySaver())


async def stream_rag_response(query: str, session_id: str, thread_id: str) -> AsyncGenerator:
    """
    Executes the LangGraph RAG pipeline and yields streaming events to the client.
    """
    config = {'configurable': {'thread_id': thread_id}}
    initial_state = {
        'query': query,
        'session_id': session_id,
        'thread_id': thread_id,
        'messages': [HumanMessage(content=query)]
    }
    
    async for event in app.astream_events(initial_state, config=config, version='v2'):
        if event['event'] == 'on_chat_model_stream':
            if 'chunk' in event['data'] and hasattr(event['data']['chunk'], 'content'):
                content = event['data']['chunk'].content
                if content:
                    yield {'type': 'token', 'data': content}
        
        elif event['event'] == 'on_chain_end' and event['name'] == 'cite':
            output = event['data'].get('output', {})
            if 'citations' in output:
                yield {'type': 'citations', 'data': output['citations']}
                
    yield {'type': 'done', 'data': {'thread_id': thread_id}}
