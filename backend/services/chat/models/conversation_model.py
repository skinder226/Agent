from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ConversationSchema(BaseModel):
    Title: str = Field(default="New Chat")
    user_id: str
    CreatedAt: datetime = Field(default_factory=datetime.now)