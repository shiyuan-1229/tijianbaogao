from collections.abc import Callable
from dataclasses import asdict
from dataclasses import dataclass

from sqlalchemy.orm import Session

from store_ai_clinic.services.conversation_messages import append_message
from store_ai_clinic.services.followups import FollowupSuggestionItem, generate_followup_suggestions
from store_ai_clinic.services.intent_router import IntentRoute, classify_intent
from store_ai_clinic.services.knowledge_retrieval import (
    KnowledgeRetrievalResult,
    build_empty_retrieval_result,
)

DiagnosisRunner = Callable[..., dict[str, object]]
KnowledgeRetriever = Callable[..., KnowledgeRetrievalResult]

LEGACY_ENGLISH_FALLBACKS = {
    "I will continue by breaking down the likely drivers behind the result.": "我会继续拆解这次结果背后的主要原因，先把最可能的驱动因素讲清楚。",
}

LEGACY_ENGLISH_SNIPPETS = {
    "Suggested next step:": "",
    "Check the daily sales report and traffic trend.": "请检查当日销售报表与客流趋势。",
    "Check staffing and in-store conversion first.": "请优先检查排班安排与店内转化情况。",
    "Reinforce first-response execution at the store level.": "请在门店层面强化首响执行。",
    "Continue monitoring daily operational data, focusing on changes in customer traffic and sales.": "请继续监控日常运营数据，重点关注客流量和销售额变化。",
}


@dataclass(frozen=True, slots=True)
class OrchestratorResponse:
    intent: str
    answer_text: str
    suggestions: list[FollowupSuggestionItem]
    diagnosis_result: dict[str, object] | None
    citations: list[dict[str, object]]
    evidence_summary: str


def run_orchestrator_turn(
    db: Session,
    *,
    session_id: str,
    store_id: str,
    user_message_text: str,
    diagnosis_runner: DiagnosisRunner,
    knowledge_retriever: KnowledgeRetriever | None = None,
    diagnosis_task_factory: Callable[[], dict[str, str]] | None = None,
    has_diagnosis_context: bool = False,
) -> OrchestratorResponse:
    append_message(
        db,
        session_id=session_id,
        role="user",
        message_type="question",
        content_text=user_message_text,
    )
    route = classify_intent(user_message_text, has_diagnosis_context=has_diagnosis_context)
    retrieval_result = (
        knowledge_retriever(
            query_text=user_message_text,
            session_id=session_id,
            store_id=store_id,
        )
        if knowledge_retriever
        else build_empty_retrieval_result(query_text=user_message_text)
    )

    diagnosis_result: dict[str, object] | None = None
    if route.intent == "initial_diagnosis":
        task_payload = diagnosis_task_factory() if diagnosis_task_factory else {}
        diagnosis_result = diagnosis_runner(
            task_id=task_payload.get("task_id", f"{session_id}-diagnosis"),
            store_id=store_id,
            diagnosis_type=task_payload.get("diagnosis_type", "daily"),
            context=user_message_text,
            session_id=session_id,
            analysis_mode="conversation",
            trigger_reason=route.intent,
        )

    diagnosis_succeeded = _has_successful_diagnosis(diagnosis_result)
    answer_text = _normalize_answer_language(
        _build_answer_text(
            route,
            diagnosis_result,
            diagnosis_succeeded=diagnosis_succeeded,
        )
    )
    assistant_message = append_message(
        db,
        session_id=session_id,
        role="assistant",
        message_type="answer",
        content_text=answer_text,
        content_json={
            "diagnosis_result": diagnosis_result,
            "citations": [asdict(citation) for citation in retrieval_result.citations],
            "evidence_summary": retrieval_result.evidence_summary,
        },
        intent_label=route.intent,
    )

    suggestion_stage = (
        "post_diagnosis"
        if has_diagnosis_context or diagnosis_succeeded
        else "pre_diagnosis"
    )
    suggestions = generate_followup_suggestions(
        stage=suggestion_stage,
        preferred_intents=_preferred_intents_for(route),
    )

    return OrchestratorResponse(
        intent=route.intent,
        answer_text=assistant_message.content_text or "",
        suggestions=suggestions,
        diagnosis_result=diagnosis_result,
        citations=[asdict(citation) for citation in retrieval_result.citations],
        evidence_summary=retrieval_result.evidence_summary,
    )


def _build_answer_text(
    route: IntentRoute,
    diagnosis_result: dict[str, object] | None,
    *,
    diagnosis_succeeded: bool,
) -> str:
    if diagnosis_succeeded and diagnosis_result:
        draft = diagnosis_result["diagnosis_draft"]
        title = str(draft["title"]).strip()
        summary = str(draft["summary"]).strip()
        next_action = str(draft["next_action"]).strip()
        parts = [title]
        if summary:
            parts.append(summary)
        if next_action:
            parts.append(f"建议下一步：{next_action}")
        return "\n".join(parts)

    if route.intent == "initial_diagnosis" and diagnosis_result:
        error_text = str(diagnosis_result.get("diagnosis_error") or "").strip()
        if error_text:
            return f"这次还没能完成诊断，当前错误：{error_text}"
        return "这次还没能完成诊断，我先保守推进下一步追问，避免误导结论。"

    fallback_text = {
        "initial_diagnosis": "我会先给出一版稳妥的首轮诊断，帮助你快速判断门店当前最值得关注的问题。",
        "why_followup": "我会继续拆解这次结果背后的主要原因，先把最可能的驱动因素讲清楚。",
        "time_drilldown": "我会优先从时段维度继续往下看，找出波动最明显的时间段。",
        "action_plan": "我会把当前结论整理成可执行动作，优先给出最值得先落地的几步。",
        "session_summary": "我可以把这一轮整理成简短总结，方便交接或归档。",
        "same_store_compare": "我会按对比门店的差异来组织答案，帮助你更快看出关键变化。",
    }
    return fallback_text.get(route.intent, "我会沿着当前上下文继续推进，并把下一步聚焦在最关键的问题上。")


def _normalize_answer_language(answer_text: str) -> str:
    trimmed = answer_text.strip()
    if not trimmed:
        return answer_text

    if trimmed in LEGACY_ENGLISH_FALLBACKS:
        return LEGACY_ENGLISH_FALLBACKS[trimmed]

    normalized = answer_text
    for english_text, chinese_text in LEGACY_ENGLISH_SNIPPETS.items():
        normalized = normalized.replace(english_text, chinese_text)

    return normalized.replace("： ", "：").strip()


def _has_successful_diagnosis(diagnosis_result: dict[str, object] | None) -> bool:
    if not diagnosis_result:
        return False
    if diagnosis_result.get("diagnosis_error"):
        return False

    draft = diagnosis_result.get("diagnosis_draft")
    if not isinstance(draft, dict):
        return False

    required_fields = ("title", "summary", "next_action")
    return all(isinstance(draft.get(field), str) and draft.get(field).strip() for field in required_fields)


def _preferred_intents_for(route: IntentRoute) -> list[str]:
    preferred_by_intent = {
        "initial_diagnosis": ["why_followup", "time_drilldown", "action_plan"],
        "why_followup": ["time_drilldown", "action_plan", "session_summary"],
        "time_drilldown": ["why_followup", "action_plan", "same_store_compare"],
        "action_plan": ["session_summary", "same_store_compare", "why_followup"],
        "session_summary": ["action_plan", "same_store_compare", "why_followup"],
        "same_store_compare": ["why_followup", "action_plan", "session_summary"],
    }
    return preferred_by_intent.get(route.intent, ["why_followup", "action_plan", "session_summary"])
