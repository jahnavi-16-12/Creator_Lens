from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and the .env file.
    Uses pydantic-settings v2 to enforce validation and type safety.
    """
    
    # Gemini API Key for LLM and Embeddings
    GEMINI_API_KEY: str = Field(
        ...,
        description="Google Gemini API key required for generating content and embeddings."
    )
    
    # Qdrant Database Configuration
    QDRANT_URL: str = Field(
        ...,
        description="The connection URL for the Qdrant vector database (e.g. cloud or local instance)."
    )
    QDRANT_API_KEY: str = Field(
        ...,
        description="The API key used to authenticate with the Qdrant vector database."
    )
    QDRANT_COLLECTION: str = Field(
        "video_chunks",
        description="The name of the collection in Qdrant where video vector embeddings are stored. Default is 'video_chunks'."
    )
    
    # Supabase Database & Storage Configuration
    SUPABASE_URL: str = Field(
        ...,
        description="The project URL for the Supabase instance."
    )
    # The .env file has SUPABASE_ANON_KEY instead of SUPABASE_KEY.
    # AliasChoices allows loading from either SUPABASE_KEY or SUPABASE_ANON_KEY automatically.
    SUPABASE_KEY: str = Field(
        ...,
        validation_alias=AliasChoices("SUPABASE_KEY", "SUPABASE_ANON_KEY"),
        description="The service role or anon key for Supabase API requests."
    )
    
    # Redis Configuration
    REDIS_URL: str = Field(
        "redis://localhost:6379",
        description="The connection URI for the Redis instance used for caching. Defaults to local host."
    )
    
    # Model Configuration
    LLM_MODEL: str = Field(
        "gemini-2.5-flash",
        description="The primary Gemini LLM model used for generation tasks. Chosen for its balance of speed and accuracy."
    )
    LLM_LITE_MODEL: str = Field(
        "gemini-2.5-flash-lite",
        description="A lighter and faster Gemini model used for simpler queries to optimize costs and response latency."
    )
    EMBEDDING_MODEL: str = Field(
        "gemini-embedding-001",
        description="The model identifier used to generate vector embeddings for text chunks."
    )
    EMBEDDING_DIMENSIONS: int = Field(
        768,
        description="The dimension size of the vectors produced by the gemini-embedding-001 model, which is 768."
    )
    
    # Chunking Configuration
    CHUNK_SIZE: int = Field(
        512,
        description="The target size (in characters or tokens) of each text segment during video transcript chunking."
    )
    CHUNK_OVERLAP: int = Field(
        64,
        description="The overlap size between adjacent text chunks to preserve semantic context across chunk boundaries."
    )
    
    # Ingestion & Concurrency Config
    MAX_INGESTION_WORKERS: int = Field(
        4,
        description="Maximum number of parallel worker tasks for processing and ingesting video transcripts."
    )
    
    # Cache TTL Configurations (in seconds)
    CACHE_TTL_TRANSCRIPT: int = Field(
        86400,
        description="TTL in seconds (24 hours) for transcript caches, as transcripts are static and rarely change."
    )
    CACHE_TTL_METADATA: int = Field(
        3600,
        description="TTL in seconds (1 hour) for video metadata caches to ensure relatively fresh view/like stats."
    )
    
    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

# Export a settings singleton for application-wide use
settings = Settings()
