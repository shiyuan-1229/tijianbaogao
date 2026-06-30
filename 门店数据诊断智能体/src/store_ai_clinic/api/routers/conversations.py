from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, StringConstraints
from sqlalchemy.orm import Session

from store_ai_clinic.db.session import SessionLocal
from store_ai_clinic.models.conversations import AgentSession
from store_ai_clinic.schemas.conversations import (
    CitationResponse,
    CreateSessionRequest,
    MessageResponse,
    SessionResponse,
)
from store_ai_clinic.services.conversation_messages import list_messages
from store_ai_clinic.services.conversation_sessions import (
    create_session,
    delete_session,
    get_session,
    list_sessions,
    rename_session,
)
from store_ai_clinic.services.diagnosis import run_diagnosis_task
from store_ai_clinic.services.knowledge_retrieval import retrieve_published_knowledge
from store_ai_clinic.services.orchestrator import run_orchestrator_turn


router = APIRouter(prefix="/api/conversations", tags=["conversations"])
NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class PostMessageRequest(BaseModel):
    message: NonEmptyString


class UpdateConversationRequest(BaseModel):
    session_title: str


class FollowupSuggestionResponse(BaseModel):
    intent: str
    text: str
    suggestion_type: str


class PostMessageResponse(BaseModel):
    assistant_message: str
    followup_suggestions: list[FollowupSuggestionResponse]
    citations: list[CitationResponse] = []
    evidence_summary: str = ""


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def retrieve_knowledge_for_turn(
    *,
    query_text: str,
    session_id: str,
    store_id: str,
    db: Session,
):
    return retrieve_published_knowledge(
        db,
        query_text=query_text,
        session_id=session_id,
        store_id=store_id,
    )


@router.post("/sessions", response_model=SessionResponse, status_code=201)
def create_conversation_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = create_session(
        db,
        brand_id=request.brand_id,
        store_id=request.store_id,
        entry_mode=request.entry_mode,
        initial_question=request.initial_question,
        diagnosis_type_hint=request.diagnosis_type_hint,
    )
    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session)


@router.post("", response_model=SessionResponse, status_code=201)
def create_conversation(
    request: CreateSessionRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    return create_conversation_session(request=request, db=db)


@router.get("/sessions", response_model=list[SessionResponse])
def list_conversation_sessions(
    store_id: Annotated[str | None, Query(min_length=1)] = None,
    db: Session = Depends(get_db),
) -> list[SessionResponse]:
    return [SessionResponse.model_validate(session) for session in list_sessions(db, store_id=store_id)]


@router.get("", response_model=list[SessionResponse])
def list_conversations(
    store_id: Annotated[str | None, Query(min_length=1)] = None,
    db: Session = Depends(get_db),
) -> list[SessionResponse]:
    return list_conversation_sessions(store_id=store_id, db=db)


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_conversation_session(
    session_id: str,
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = get_session(db, session_id=session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Unknown session_id: {session_id}")
    return SessionResponse.model_validate(session)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def list_conversation_messages(
    session_id: str,
    db: Session = Depends(get_db),
) -> list[MessageResponse]:
    session = get_session(db, session_id=session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Unknown session_id: {session_id}")

    return [
        MessageResponse.model_validate(message)
        for message in list_messages(db, session_id=session_id)
    ]


@router.patch("/{session_id}", response_model=SessionResponse)
def update_conversation(
    session_id: str,
    request: UpdateConversationRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    try:
        session = rename_session(
            db,
            session_id=session_id,
            session_title=request.session_title,
        )
    except ValueError as exc:
        db.rollback()
        message = str(exc)
        if message.startswith("Unknown session_id:"):
            raise HTTPException(status_code=404, detail=message) from exc
        raise HTTPException(status_code=400, detail=message) from exc

    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session)


@router.delete("/{session_id}", status_code=204)
def delete_conversation(
    session_id: str,
    db: Session = Depends(get_db),
) -> Response:
    deleted = delete_session(db, session_id=session_id)
    if not deleted:
        db.rollback()
        raise HTTPException(status_code=404, detail=f"Unknown session_id: {session_id}")

    db.commit()
    return Response(status_code=204)


@router.post("/sessions/{session_id}/messages", response_model=PostMessageResponse)
def post_conversation_message(
    session_id: str,
    request: PostMessageRequest,
    db: Session = Depends(get_db),
) -> PostMessageResponse:
    session = db.get(AgentSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Unknown session_id: {session_id}")

    try:
        result = run_orchestrator_turn(
            db,
            session_id=session_id,
            store_id=session.store_id,
            user_message_text=request.message,
            diagnosis_runner=run_diagnosis_task,
            knowledge_retriever=lambda **kwargs: retrieve_knowledge_for_turn(
                db=db,
                **kwargs,
            ),
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        db.rollback()
        raise

    db.commit()
    return PostMessageResponse(
        assistant_message=result.answer_text,
        followup_suggestions=[
            FollowupSuggestionResponse(
                intent=suggestion.intent,
                text=suggestion.text,
                suggestion_type=suggestion.suggestion_type,
            )
            for suggestion in result.suggestions
        ],
        citations=[
            CitationResponse(**citation)
            for citation in result.citations
        ],
        evidence_summary=result.evidence_summary,
    )
