from supabase._async.client import AsyncClient
from app.core.config import settings

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

# Initialize the async Supabase client synchronously to export as a singleton
supabase_client: AsyncClient = AsyncClient(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)


async def create_session() -> str:
    """
    Inserts a new row into video_sessions and returns the generated session_id.
    """
    response = await supabase_client.table('video_sessions').insert({}).execute()
    return response.data[0]['session_id']


async def save_video_metadata(data: dict) -> dict:
    """
    Upserts video metadata into the video_metadata table and returns the row.
    """
    response = await supabase_client.table('video_metadata').upsert(data).execute()
    return response.data[0]


async def get_session_metadata(session_id: str) -> list[dict]:
    """
    Returns both video metadata rows for a specific session.
    """
    response = await supabase_client.table('video_metadata').select('*').eq('session_id', session_id).execute()
    return response.data


async def update_transcript_status(session_id: str, label: str, status: str, chunks: int):
    """
    Updates the transcript_status and chunks_count for a specific video in a session.
    """
    await supabase_client.table('video_metadata').update({
        'transcript_status': status,
        'chunks_count': chunks
    }).match({
        'session_id': session_id,
        'video_label': label
    }).execute()
