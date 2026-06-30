import pytest

from store_ai_clinic.services.intent_router import (
    DEFAULT_INTENT,
    classify_intent,
)


@pytest.mark.parametrize(
    ("message_text", "has_diagnosis_context", "expected"),
    [
        ("帮我看下这家店今天的数据", False, "initial_diagnosis"),
        ("为什么会下降这么多？", True, "why_followup"),
        ("哪个时间段掉得最厉害？", True, "time_drilldown"),
        ("下一步具体怎么做？", True, "action_plan"),
        ("帮我总结一下这次结论", True, "session_summary"),
        ("和同品牌另外一家店对比一下", True, "same_store_compare"),
    ],
)
def test_classify_intent_routes_supported_v1_intents(
    message_text: str,
    has_diagnosis_context: bool,
    expected: str,
):
    result = classify_intent(
        message_text,
        has_diagnosis_context=has_diagnosis_context,
    )

    assert result.intent == expected
    assert result.confidence == "high"


def test_classify_intent_defaults_to_initial_diagnosis_without_context():
    result = classify_intent(
        "这周门店表现怎么样",
        has_diagnosis_context=False,
    )

    assert result.intent == "initial_diagnosis"
    assert result.reason == "no_diagnosis_context"


def test_classify_intent_defaults_conservatively_with_context():
    result = classify_intent(
        "继续说说",
        has_diagnosis_context=True,
    )

    assert result.intent == DEFAULT_INTENT
    assert result.reason == "fallback_followup"
