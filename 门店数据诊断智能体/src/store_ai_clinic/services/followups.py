from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FollowupSuggestionItem:
    intent: str
    text: str
    suggestion_type: str


_PRE_DIAGNOSIS_SUGGESTIONS: tuple[FollowupSuggestionItem, ...] = (
    FollowupSuggestionItem("initial_diagnosis", "先帮我看今天这家店整体表现", "diagnosis_prompt"),
    FollowupSuggestionItem("initial_diagnosis", "聚焦分析最近 7 天波动最大的指标", "diagnosis_prompt"),
    FollowupSuggestionItem("initial_diagnosis", "结合活动和客流解释这周异常", "diagnosis_prompt"),
)

_POST_DIAGNOSIS_LIBRARY: dict[str, FollowupSuggestionItem] = {
    "why_followup": FollowupSuggestionItem("why_followup", "为什么会出现这个结果？", "why_followup"),
    "time_drilldown": FollowupSuggestionItem("time_drilldown", "哪个时间段的问题最明显？", "time_drilldown"),
    "action_plan": FollowupSuggestionItem("action_plan", "下一步最值得优先执行什么动作？", "action_plan"),
    "session_summary": FollowupSuggestionItem("session_summary", "帮我总结这次诊断结论", "session_summary"),
    "same_store_compare": FollowupSuggestionItem("same_store_compare", "和同品牌其他门店对比一下", "same_store_compare"),
}
_DEFAULT_POST_DIAGNOSIS_ORDER: tuple[str, ...] = (
    "why_followup",
    "time_drilldown",
    "action_plan",
)


def generate_followup_suggestions(
    *,
    stage: str,
    preferred_intents: list[str] | None = None,
) -> list[FollowupSuggestionItem]:
    if stage == "pre_diagnosis":
        return list(_PRE_DIAGNOSIS_SUGGESTIONS)

    ordered_intents = _dedupe_preserving_order(preferred_intents or list(_DEFAULT_POST_DIAGNOSIS_ORDER))
    suggestions = [
        _POST_DIAGNOSIS_LIBRARY[intent]
        for intent in ordered_intents
        if intent in _POST_DIAGNOSIS_LIBRARY
    ]

    if len(suggestions) < 2:
        for intent in _DEFAULT_POST_DIAGNOSIS_ORDER:
            item = _POST_DIAGNOSIS_LIBRARY[intent]
            if item not in suggestions:
                suggestions.append(item)
            if len(suggestions) >= 3:
                break

    return suggestions[:3]


def _dedupe_preserving_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result
