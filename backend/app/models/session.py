from pydantic import BaseModel, Field
from datetime import datetime

class SessionModel(BaseModel):
    id: str = Field(..., description="Unique session identifier (UUID)")
    title: str = Field(..., description="User-provided or generated session title")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    video_a_url: str = Field(..., description="YouTube URL for video A")
    video_b_url: str = Field(..., description="YouTube URL for video B")
    chat_history: list[dict] = Field(default_factory=list, description="List of chat messages with role and content")
    citations: list[dict] = Field(default_factory=list, description="Citation data extracted from analysis")
