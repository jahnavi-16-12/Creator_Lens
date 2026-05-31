from typing import List, Optional
from app.core.supabase_client import get_client

async def create_session(session_id: Optional[str] = None) -> dict:
    """
    Creates a new session in video_sessions.
    """
    client = await get_client()
    payload = {}
    if session_id:
        payload["session_id"] = session_id
    resp = await client.table('video_sessions').insert(payload).execute()
    return resp.data[0] if resp.data else {}

async def get_session(session_id: str) -> Optional[dict]:
    """
    Gets session by ID and fetches its associated video metadata.
    """
    client = await get_client()
    # Get session row
    resp = await client.table('video_sessions').select('*').eq('session_id', session_id).execute()
    if not resp.data:
        return None
    session_row = resp.data[0]
    
    # Get video metadata
    meta_resp = await client.table('video_metadata').select('*').eq('session_id', session_id).execute()
    meta_list = meta_resp.data or []
    
    video_a = next((m for m in meta_list if m.get('video_label') == 'A'), None)
    video_b = next((m for m in meta_list if m.get('video_label') == 'B'), None)
    
    # Generate a descriptive title
    title = "New Analysis"
    if video_a or video_b:
        title = f"{video_a.get('title') or 'YouTube'} vs {video_b.get('title') or 'Instagram'}"
        
    return {
        "id": session_row.get("session_id"),
        "title": title,
        "created_at": session_row.get("created_at"),
        "video_a": video_a,
        "video_b": video_b,
        "video_a_url": video_a.get("url") if video_a else "",
        "video_b_url": video_b.get("url") if video_b else "",
    }

async def list_sessions(limit: int = 20, offset: int = 0) -> List[dict]:
    """
    Lists recent sessions with their metadata.
    """
    client = await get_client()
    resp = await client.table('video_sessions').select('*').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
    if not resp.data:
        return []
    
    sessions_list = []
    for row in resp.data:
        session_id = row.get("session_id")
        meta_resp = await client.table('video_metadata').select('*').eq('session_id', session_id).execute()
        meta_list = meta_resp.data or []
        
        video_a = next((m for m in meta_list if m.get('video_label') == 'A'), None)
        video_b = next((m for m in meta_list if m.get('video_label') == 'B'), None)
        
        title = "New Analysis"
        if video_a or video_b:
            title = f"{video_a.get('creator') or 'YouTube'} vs {video_b.get('creator') or 'Instagram'}"
            
        sessions_list.append({
            "id": session_id,
            "title": title,
            "created_at": row.get("created_at"),
            "video_a": video_a,
            "video_b": video_b,
            "video_a_url": video_a.get("url") if video_a else "",
            "video_b_url": video_b.get("url") if video_b else "",
        })
    return sessions_list

async def update_session(session_id: str, updates: dict) -> dict:
    """
    Updates the session row. Since video_sessions has a simple schema, we just return the session.
    """
    return await get_session(session_id) or {}
