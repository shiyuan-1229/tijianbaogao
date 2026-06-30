from dataclasses import dataclass

DEFAULT_INTENT = "why_followup"

_INTENT_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("session_summary", ("总结", "汇总", "小结", "summary")),
    ("same_store_compare", ("对比", "比较", "另一家", "同品牌", "compare")),
    ("time_drilldown", ("时间段", "小时", "时段", "几点", "高峰", "drilldown")),
    ("action_plan", ("怎么做", "下一步", "行动", "建议", "plan")),
    ("why_followup", ("为什么", "原因", "为何", "why")),
    ("initial_diagnosis", ("诊断", "分析", "看下", "表现", "数据")),
)


@dataclass(frozen=True, slots=True)
class IntentRoute:
    intent: str
    confidence: str
    reason: str


def classify_intent(message_text: str, *, has_diagnosis_context: bool) -> IntentRoute:
    normalized = _normalize(message_text)

    if not has_diagnosis_context:
        non_initial_intents = [rule for rule in _INTENT_RULES if rule[0] != "initial_diagnosis"]
        for intent, keywords in non_initial_intents:
            if any(keyword in normalized for keyword in keywords):
                return IntentRoute(intent=intent, confidence="high", reason=f"matched:{intent}")
        return IntentRoute(
            intent="initial_diagnosis",
            confidence="high",
            reason="no_diagnosis_context",
        )

    for intent, keywords in _INTENT_RULES:
        if any(keyword in normalized for keyword in keywords):
            return IntentRoute(intent=intent, confidence="high", reason=f"matched:{intent}")

    return IntentRoute(
        intent=DEFAULT_INTENT,
        confidence="medium",
        reason="fallback_followup",
    )


def _normalize(value: str) -> str:
    return value.strip().lower()
