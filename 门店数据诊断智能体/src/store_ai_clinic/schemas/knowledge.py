from pydantic import BaseModel


class CreateKnowledgeSourceRequest(BaseModel):
    source_title: str
    knowledge_type: str
    version_label: str | None = None


class KnowledgeSourceListItemResponse(BaseModel):
    source_id: str
    source_title: str
    knowledge_type: str
    status: str
    version_label: str | None = None
    updated_at: str
    chunk_count: int
