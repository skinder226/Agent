from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class MessageSchema(BaseModel):
    conversation_id: str
    role: MessageRole
    content: str
    images : Optional[list[str]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)