import os
import re
import shutil
import asyncio
import tempfile
import logging
from typing import Dict, Any, Optional

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

import yt_dlp
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

class TranscriptExtractionError(Exception):
    """Custom exception raised when transcript extraction fails."""
    def __init__(self, url: str, reason: str):
        self.url = url
        self.reason = reason
        super().__init__(f"Failed to extract transcript for {url}: {reason}")

# Singleton Whisper model to avoid reloading on every request
_whisper_model = None

def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        # Use faster-whisper (available in requirements.txt) 
        # as a high-performance alternative to openai-whisper.
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    return _whisper_model

def extract_youtube_id(url: str) -> str:
    """
    Extracts the YouTube video ID from various common URL formats.
    Raises ValueError if the URL is not a valid YouTube URL.
    """
    pattern = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    
    raise ValueError(f"Not a valid YouTube URL: {url}")

def _download_and_transcribe(url: str) -> Dict[str, Any]:
    """
    Synchronous fallback function to download audio via yt-dlp and transcribe using Whisper.
    This function should be wrapped in asyncio.to_thread.
    """
    temp_dir = tempfile.mkdtemp()
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(temp_dir, '%(id)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'no_warnings': True
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        files = os.listdir(temp_dir)
        if not files:
            raise TranscriptExtractionError(url, "Failed to download audio from the provided URL.")
            
        audio_file = os.path.join(temp_dir, files[0])
        model = _get_whisper_model()
        segments, info = model.transcribe(audio_file, beam_size=5)
        
        transcript_text = " ".join([segment.text.strip() for segment in segments])
        
        return {
            'transcript': transcript_text.strip(),
            'method': 'whisper',
            'language': info.language
        }
    except Exception as e:
        logger.error(f"Transcript extraction failed for {url}: {e}")
        raise TranscriptExtractionError(url, str(e))
    finally:
        # Ensure temporary directory and its contents are cleaned up
        shutil.rmtree(temp_dir, ignore_errors=True)

def _get_api_transcript_sync(video_id: str) -> Optional[Dict[str, Any]]:
    """
    Synchronous helper to fetch a YouTube transcript using youtube_transcript_api.
    """
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Try retrieving English first
        try:
            transcript = transcript_list.find_transcript(['en'])
        except NoTranscriptFound:
            # Fallback to any available language if English is missing
            transcript = list(transcript_list)[0]
            
        transcript_data = transcript.fetch()
        formatter = TextFormatter()
        text = formatter.format_transcript(transcript_data).replace('\n', ' ')
        
        return {
            'transcript': text,
            'method': 'api',
            'language': transcript.language_code
        }
    except Exception as e:
        logger.warning(f"YouTube Transcript API failed for {video_id}: {e}. Falling back to Whisper.")
        return None  # Trigger fallback

async def get_youtube_transcript(url: str) -> Dict[str, Any]:
    """
    Retrieves the transcript for a YouTube video.
    Strategy 1: Use youtube_transcript_api (fast, free)
    Strategy 2: Fallback to yt-dlp + whisper
    """
    try:
        video_id = extract_youtube_id(url)
    except ValueError as e:
        raise TranscriptExtractionError(url, str(e))
        
    # Strategy 1 (Fastest, free API)
    api_result = await asyncio.to_thread(_get_api_transcript_sync, video_id)
    if api_result:
        return api_result
        
    # Strategy 2 (Fallback downloading + whisper)
    return await asyncio.to_thread(_download_and_transcribe, url)

async def get_instagram_transcript(url: str) -> Dict[str, Any]:
    """
    Retrieves the transcript for an Instagram reel.
    Validates the URL format and uses yt-dlp + whisper to download and transcribe public reels.
    """
    if "instagram.com/reel" not in url and "instagram.com/p/" not in url:
        raise ValueError(f"Not a valid Instagram Reel URL: {url}")
        
    result = await asyncio.to_thread(_download_and_transcribe, url)
    return result
