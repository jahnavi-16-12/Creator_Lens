import logging
import asyncio
from typing import Dict, Any

import yt_dlp

logger = logging.getLogger(__name__)


def _extract_info_sync(url: str) -> dict:
    """
    Synchronous helper to extract video info using yt-dlp.
    Should be wrapped in asyncio.to_thread to prevent blocking.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=False)


async def get_youtube_metadata(url: str) -> dict:
    """
    Extracts metadata from a YouTube video URL using yt_dlp.
    Handles missing fields gracefully by returning None where applicable.
    """
    try:
        info = await asyncio.to_thread(_extract_info_sync, url)
    except Exception as e:
        logger.error(f"Failed to extract metadata for YouTube URL {url}: {e}")
        info = {}

    tags = info.get('tags') or []

    return {
        'title': info.get('title'),
        'creator': info.get('uploader') or info.get('channel'),
        'follower_count': info.get('channel_follower_count'),
        'views': info.get('view_count'),
        'likes': info.get('like_count'),
        'comments': info.get('comment_count'),
        'hashtags': tags[:10],
        'upload_date': info.get('upload_date'),
        'duration_seconds': info.get('duration'),
        'platform': 'youtube'
    }


async def get_instagram_metadata(url: str) -> dict:
    """
    Extracts metadata from an Instagram URL using yt_dlp.
    Instagram limits public metadata, so views/likes/comments may be None.
    Handles missing fields gracefully.
    """
    try:
        info = await asyncio.to_thread(_extract_info_sync, url)
    except Exception as e:
        logger.error(f"Failed to extract metadata for Instagram URL {url}: {e}")
        info = {}

    tags = info.get('tags') or []

    return {
        'title': info.get('title') or info.get('description'),
        'creator': info.get('uploader') or info.get('channel'),
        'follower_count': info.get('channel_follower_count'),
        'views': info.get('view_count'),
        'likes': info.get('like_count'),
        'comments': info.get('comment_count'),
        'hashtags': tags[:10],
        'upload_date': info.get('upload_date'),
        'duration_seconds': info.get('duration'),
        'platform': 'instagram'
    }


def compute_engagement_rate(
    likes: int | None, 
    comments: int | None, 
    views: int | None
) -> float | None:
    """
    Computes the engagement rate based on likes, comments, and views.
    Formula: (likes + comments) / views * 100
    Returns None if views is 0 or None to avoid division by zero.
    Rounds to 4 decimal places.
    """
    if not views:
        return None

    safe_likes = likes if likes is not None else 0
    safe_comments = comments if comments is not None else 0

    try:
        rate = ((safe_likes + safe_comments) / views) * 100
        return round(rate, 4)
    except Exception:
        return None
