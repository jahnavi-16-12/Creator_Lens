from fastapi import APIRouter, HTTPException
from app.models.session import SessionModel
from app.services.session_service import create_session, get_session, list_sessions, update_session

router = APIRouter()

@router.post('/')
async def create_new_session(session: SessionModel):
    try:
        created = await create_session(session.id)
        return created
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/')
async def get_sessions(limit: int = 20, offset: int = 0):
    return await list_sessions(limit, offset)

@router.get('/{session_id}')
async def get_session_detail(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')
    return session

@router.patch('/{session_id}')
async def patch_session(session_id: str, updates: dict):
    updated = await update_session(session_id, updates)
    return updated
