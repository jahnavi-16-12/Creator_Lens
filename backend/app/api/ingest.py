import time
import logging
import asyncio
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.supabase_client import create_session, save_video_metadata, update_transcript_status
from app.core.qdrant_client import ensure_collection_exists
from app.services.metadata import get_youtube_metadata, get_instagram_metadata, compute_engagement_rate
from app.services.transcript import get_youtube_transcript, get_instagram_transcript, TranscriptExtractionError
from app.services.embeddings import chunk_transcript, embed_and_store_chunks

logger = logging.getLogger(__name__)

router = APIRouter()


class IngestRequest(BaseModel):
    url_a: str
    url_b: str
    session_id: Optional[str] = None


class IngestResponse(BaseModel):
    session_id: str
    video_a: dict
    video_b: dict
    chunks: dict
    errors: dict
    status: str


@router.post("/ingest", response_model=IngestResponse)
async def ingest_videos(req: IngestRequest, request: Request):
    # 1. Validate Platforms
    if 'youtube.com' not in req.url_a and 'youtu.be' not in req.url_a:
        raise HTTPException(status_code=422, detail="url_a must be a valid YouTube URL")
    if 'instagram.com' not in req.url_b:
        raise HTTPException(status_code=422, detail="url_b must be a valid Instagram URL")

    # 2. Initialize Qdrant Collection (Runs synchronously in thread pool)
    t0 = time.perf_counter()
    await asyncio.to_thread(ensure_collection_exists)
    t1 = time.perf_counter()
    logger.info(f"ensure_collection_exists took {t1 - t0:.2f}s")

    # 3. Create Session if needed
    t0 = time.perf_counter()
    session_id = req.session_id or await create_session()
    t1 = time.perf_counter()
    logger.info(f"Session setup took {t1 - t0:.2f}s")

    # 4. Fetch Metadata Concurrently
    async def safe_meta_fetch(fetcher, url):
        try:
            return await fetcher(url), None
        except Exception as e:
            logger.error(f"Metadata fetch error for {url}: {e}")
            return None, str(e)

    t0 = time.perf_counter()
    (meta_a, err_a), (meta_b, err_b) = await asyncio.gather(
        safe_meta_fetch(get_youtube_metadata, req.url_a),
        safe_meta_fetch(get_instagram_metadata, req.url_b)
    )
    t1 = time.perf_counter()
    logger.info(f"Metadata fetch took {t1 - t0:.2f}s")

    # 5. Process & Save Metadata Concurrently
    async def process_and_save(meta, label, url, platform):
        if not meta:
            return {}
        
        meta['engagement_rate'] = compute_engagement_rate(
            meta.get('likes'), meta.get('comments'), meta.get('views')
        )
        row = {
            'session_id': session_id,
            'video_label': label,
            'url': url,
            'platform': platform,
            'title': meta.get('title'),
            'creator': meta.get('creator'),
            'follower_count': meta.get('follower_count'),
            'views': meta.get('views'),
            'likes': meta.get('likes'),
            'comments': meta.get('comments'),
            'hashtags': meta.get('hashtags', []),
            'upload_date': meta.get('upload_date'),
            'duration_seconds': meta.get('duration_seconds'),
            'engagement_rate': meta.get('engagement_rate'),
            'transcript_status': 'pending',
            'chunks_count': 0
        }
        return await save_video_metadata(row)

    t0 = time.perf_counter()
    saved_a, saved_b = await asyncio.gather(
        process_and_save(meta_a, 'A', req.url_a, 'youtube') if meta_a else asyncio.sleep(0),
        process_and_save(meta_b, 'B', req.url_b, 'instagram') if meta_b else asyncio.sleep(0)
    )
    # asyncio.sleep(0) returns None, ensure we default to empty dict
    saved_a = saved_a or {}
    saved_b = saved_b or {}
    t1 = time.perf_counter()
    logger.info(f"Metadata save took {t1 - t0:.2f}s")

    # 6. Fetch Transcripts Concurrently
    async def safe_trans_fetch(fetcher, url, meta_exists):
        if not meta_exists:
            return None, "Skipped due to metadata failure"
        try:
            return await fetcher(url), None
        except Exception as e:
            logger.error(f"Transcript fetch error for {url}: {e}")
            return None, str(e)

    t0 = time.perf_counter()
    (trans_a, t_err_a), (trans_b, t_err_b) = await asyncio.gather(
        safe_trans_fetch(get_youtube_transcript, req.url_a, bool(meta_a)),
        safe_trans_fetch(get_instagram_transcript, req.url_b, bool(meta_b))
    )
    t1 = time.perf_counter()
    logger.info(f"Transcript fetch took {t1 - t0:.2f}s")
    
    err_a = err_a or t_err_a
    err_b = err_b or t_err_b

    # 7. Chunk and Embed Concurrently
    async def process_chunks(trans_data, saved_meta, label):
        if not trans_data or not saved_meta:
            return 0, None
        try:
            transcript_text = trans_data.get('transcript', '')
            chunks = chunk_transcript(transcript_text, saved_meta)
            count = await embed_and_store_chunks(chunks)
            await update_transcript_status(session_id, label, 'done', count)
            return count, None
        except Exception as e:
            logger.error(f"Chunk processing error for video {label}: {e}")
            await update_transcript_status(session_id, label, 'failed', 0)
            return 0, str(e)

    t0 = time.perf_counter()
    (chunks_a, c_err_a), (chunks_b, c_err_b) = await asyncio.gather(
        process_chunks(trans_a, saved_a, 'A'),
        process_chunks(trans_b, saved_b, 'B')
    )
    t1 = time.perf_counter()
    logger.info(f"Chunk & Embed processing took {t1 - t0:.2f}s")
    
    err_a = err_a or c_err_a
    err_b = err_b or c_err_b

    # 8. Determine overall status
    status = 'ready'
    if err_a and err_b:
        status = 'failed'
    elif err_a or err_b:
        status = 'partial'

    return IngestResponse(
        session_id=session_id,
        video_a=saved_a,
        video_b=saved_b,
        chunks={'a': chunks_a, 'b': chunks_b},
        errors={'a': err_a, 'b': err_b},
        status=status
    )
