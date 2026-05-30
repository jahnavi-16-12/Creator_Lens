import json
import logging
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.services.rag_graph import stream_rag_response, app as graph_app

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    session_id: str
    thread_id: Optional[str] = None


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, request: Request):
    # Generate thread_id if not provided
    thread_id = req.thread_id or str(uuid4())

    async def event_generator():
        try:
            async for event in stream_rag_response(req.query, req.session_id, thread_id):
                # Early exit if the client disconnects
                if await request.is_disconnected():
                    logger.info(f"Client disconnected from stream for thread {thread_id}")
                    break

                if event['type'] == 'token':
                    yield {
                        "event": "token",
                        "data": json.dumps({"text": event['data']})
                    }
                elif event['type'] == 'citations':
                    yield {
                        "event": "citations",
                        "data": json.dumps({"citations": event['data']})
                    }
                elif event['type'] == 'done':
                    yield {
                        "event": "done",
                        "data": json.dumps({"thread_id": event['data']['thread_id']})
                    }
                    
        except Exception as e:
            logger.error(f"Stream generation error: {e}", exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"message": str(e) or "An error occurred during generation."})
            }

    # Wrap the generator in EventSourceResponse and explicitly add CORS headers
    return EventSourceResponse(
        event_generator(),
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )


@router.get("/chat/history/{thread_id}")
async def get_chat_history(thread_id: str):
    """
    Retrieves message history from the LangGraph MemorySaver for a given thread_id.
    """
    config = {"configurable": {"thread_id": thread_id}}
    state = graph_app.get_state(config)
    
    history = []
    if state and state.values:
        messages = state.values.get("messages", [])
        for msg in messages:
            # Skip system messages, only return user and assistant dialogue
            if msg.type == "system":
                continue
                
            role = "user" if msg.type == "human" else "assistant"
            history.append({
                "role": role,
                "content": msg.content
            })
            
    return JSONResponse(
        content=history,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )
