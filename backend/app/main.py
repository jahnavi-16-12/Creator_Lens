import time
import asyncio
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.qdrant_client import ensure_collection_exists
from app.api import ingest, chat, sessions

# Configure standard logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize rate limiter: 100 requests per minute per IP
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(title='Video RAG Analytics', version='1.0.0')

# Attach rate limiter and handle exceed limits cleanly
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS Middleware
# Note: allow_credentials=True is incompatible with allow_origins=['*'].
# Use an explicit origins list so credentialed requests work correctly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware("http")
async def log_slow_requests(request: Request, call_next):
    """
    Request timing middleware that logs any request taking over 3 seconds.
    """
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    
    if process_time > 3.0:
        logger.warning(
            f"Slow request detected: {request.method} {request.url.path} "
            f"took {process_time:.2f} seconds."
        )
        
    return response


# Include Routers
app.include_router(ingest.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])


@app.on_event('startup')
async def startup():
    """
    Startup hook to initialize Qdrant collections and securely log settings.
    """
    logger.info("Starting Video RAG Analytics API...")
    
    # 1. Ensure Qdrant collection exists (Offloaded to a thread pool for safety)
    try:
        await asyncio.to_thread(ensure_collection_exists)
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collection on startup: {e}")
        
    # 2. Log configuration settings securely
    def mask_key(key: str) -> str:
        if not key or len(key) < 8:
            return "***"
        return f"{key[:4]}...{key[-4:]}"
        
    logger.info(f"Config - LLM Model: {settings.LLM_MODEL}")
    logger.info(f"Config - Embedding Model: {settings.EMBEDDING_MODEL}")
    logger.info(f"Config - Qdrant URL: {settings.QDRANT_URL}")
    logger.info(f"Config - Supabase URL: {settings.SUPABASE_URL}")
    
    # Mask API Keys
    logger.info(f"Config - GEMINI_API_KEY: {mask_key(settings.GEMINI_API_KEY)}")
    logger.info(f"Config - QDRANT_API_KEY: {mask_key(settings.QDRANT_API_KEY)}")
    logger.info(f"Config - SUPABASE_KEY: {mask_key(settings.SUPABASE_KEY)}")


@app.get('/health')
@limiter.exempt
async def health(request: Request):
    """
    Basic health check endpoint returning system status.
    """
    return {
        'status': 'ok',
        'version': '1.0.0',
        'models': {
            'llm': settings.LLM_MODEL,
            'embed': settings.EMBEDDING_MODEL
        }
    }
