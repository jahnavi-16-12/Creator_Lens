import logging
from typing import Optional

from qdrant_client import QdrantClient
# pyrefly: ignore [missing-import]
from qdrant_client.http import models

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize the QdrantClient singleton
qdrant = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY
)


def ensure_collection_exists():
    """
    Checks if the configured Qdrant collection exists.
    If not, creates it with specific vector and optimizer configurations for fast bulk insert.
    """
    try:
        collections_response = qdrant.get_collections()
        exists = any(c.name == settings.QDRANT_COLLECTION for c in collections_response.collections)
        
        if not exists:
            qdrant.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=models.VectorParams(
                    size=settings.EMBEDDING_DIMENSIONS,  # Typically 768 for Gemini
                    distance=models.Distance.COSINE
                ),
                optimizers_config=models.OptimizersConfigDiff(
                    indexing_threshold=20000
                )
            )
            logger.info(f"Qdrant collection '{settings.QDRANT_COLLECTION}' created.")
            print(f"Qdrant collection '{settings.QDRANT_COLLECTION}' created.")
        else:
            logger.info(f"Qdrant collection '{settings.QDRANT_COLLECTION}' already exists.")
            print(f"Qdrant collection '{settings.QDRANT_COLLECTION}' already exists.")
            
    except Exception as e:
        logger.error(f"Error checking/creating Qdrant collection: {e}")
        print(f"Error checking/creating Qdrant collection: {e}")
        raise


def upsert_chunks(documents: list[dict]) -> int:
    """
    Batch upserts video chunks into the Qdrant collection.
    Accepts a list of dicts formatted as: {'id': str/int, 'vector': list[float], 'payload': dict}
    """
    batch_size = 100
    total_upserted = 0
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        points = [
            models.PointStruct(
                id=doc["id"],
                vector=doc["vector"],
                payload=doc["payload"]
            )
            for doc in batch
        ]
        
        qdrant.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points
        )
        total_upserted += len(batch)
        
    return total_upserted


def search_chunks(
    query_vector: list[float], 
    session_id: str, 
    k: int = 6, 
    video_label: Optional[str] = None
) -> list[dict]:
    """
    Searches the Qdrant collection for the closest chunks to the query_vector.
    Requires session_id to isolate the search to the correct user session.
    Optionally filters by video_label ('A' or 'B').
    """
    must_conditions = [
        models.FieldCondition(
            key="session_id",
            match=models.MatchValue(value=session_id)
        )
    ]
    
    if video_label:
        must_conditions.append(
            models.FieldCondition(
                key="video_label",
                match=models.MatchValue(value=video_label)
            )
        )
        
    search_result = qdrant.search(
        collection_name=settings.QDRANT_COLLECTION,
        query_vector=query_vector,
        query_filter=models.Filter(
            must=must_conditions
        ),
        limit=k
    )
    
    results = []
    for hit in search_result:
        payload = hit.payload or {}
        results.append({
            "score": hit.score,
            "text": payload.get("text", ""),
            "video_label": payload.get("video_label", ""),
            "chunk_index": payload.get("chunk_index", 0),
            "creator": payload.get("creator", ""),
            "url": payload.get("url", "")
        })
        
    return results
