from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class MessageChannel(str, Enum):
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    IN_APP = "IN_APP"

class MessageRole(str, Enum):
    AGENT = "AGENT"
    CLIENT = "CLIENT"
    SYSTEM = "SYSTEM"

class Message(BaseModel):
    id: Optional[int] = None
    thread_id: int
    channel: MessageChannel
    role: MessageRole
    content: str
    metadata: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ThreadStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PENDING_REPLY = "PENDING_REPLY"
    ARCHIVED = "ARCHIVED"

class CommunicationThread(BaseModel):
    id: int
    lead_id: int
    tenant_id: int
    status: ThreadStatus
    last_message_at: datetime
    messages: List[Message] = []

class MessageDraftRequest(BaseModel):
    thread_id: int
    context: Optional[str] = None # e.g. "Follow up on the Dubai quote"
    tone: str = "Professional" # Friendly, Formal, Urgency

class DraftResponse(BaseModel):
    suggested_content: str
    reasoning: str
