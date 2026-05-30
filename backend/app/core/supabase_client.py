from __future__ import annotations

import logging
from supabase._async.client import AsyncClient, create_client
from app.core.config import settings

logger = logging.getLogger(__name__)

"""
SQL Schema for Supabase (run manually in dashboard SQL editor):

CREATE TABLE IF NOT EXISTS video_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_sessions(session_id),
  video_label TEXT NOT NULL,        -- 'A' or 'B'
  url TEXT NOT NULL,
  platform TEXT NOT NULL,           -- 'youtube' or 'instagram'
  title TEXT,
  creator TEXT,
  follower_count BIGINT,
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  hashtags JSONB DEFAULT '[]',
  upload_date TEXT,
  duration_seconds INT,
  engagement_rate FLOAT,            -- (likes+comments)/views*100
  transcript_status TEXT DEFAULT 'pending',
  chunks_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

# Lazily initialized async Supabase client singleton
_supabase_client: AsyncClient | None = None


async def get_client() -> AsyncClient:
    """
    Returns the async Supabase client, initializing it on first call.
    Using lazy init avoids key validation errors at module import time
    and allows the app to start even if env vars are temporarily missing.
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = await create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
        logger.info("Supabase async client initialized.")
    return _supabase_client


async def create_session() -> str:
    """
    Inserts a new row into video_sessions and returns the generated session_id.
    """
    client = await get_client()
    response = await client.table('video_sessions').insert({}).execute()
    return response.data[0]['session_id']


async def save_video_metadata(data: dict) -> dict:
    """
    Upserts video metadata into the video_metadata table and returns the row.
    """
    client = await get_client()
    response = await client.table('video_metadata').upsert(data).execute()
    return response.data[0]


async def get_session_metadata(session_id: str) -> list[dict]:
    """
    Returns both video metadata rows for a specific session.
    """
    client = await get_client()
    response = await client.table('video_metadata').select('*').eq('session_id', session_id).execute()
    return response.data


async def update_transcript_status(session_id: str, label: str, status: str, chunks: int):
    """
    Updates the transcript_status and chunks_count for a specific video in a session.
    """
    client = await get_client()
    await client.table('video_metadata').update({
        'transcript_status': status,
        'chunks_count': chunks
    }).match({
        'session_id': session_id,
        'video_label': label
    }).execute()
