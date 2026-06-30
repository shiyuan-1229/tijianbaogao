import pytest


from store_ai_clinic.services.llm import DiagnosisLlmService, LlmServiceError


def test_diagnosis_llm_service_returns_structured_draft(monkeypatch):
    captured: dict[str, object] = {}

    class DummyCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return type(
                "Response",
                (),
                {
                    "choices": [
                        type(
                            "Choice",
                            (),
                            {
                                "message": type(
                                    "Message",
                                    (),
                                    {
                                        "content": (
                                            '{"title":"库存周转偏低","summary":"近 7 日库存周转率低于阈值。",'
                                            '"next_action":"优先复核补货节奏。"}'
                                        )
                                    },
                                )()
                            },
                        )()
                    ]
                },
            )()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            captured["api_key"] = api_key
            captured["base_url"] = base_url
            captured["client_timeout"] = timeout
            self.chat = type("Chat", (), {"completions": DummyCompletions()})()

    monkeypatch.setattr("store_ai_clinic.services.llm.OpenAI", DummyOpenAI)

    service = DiagnosisLlmService(
        api_key="test-key",
        base_url="https://api.deepseek.com",
        model="deepseek-chat",
        timeout_seconds=20,
    )

    result = service.generate_diagnosis_draft(
        task_id="task-001",
        store_id="SH001",
        diagnosis_type="daily",
        context="库存周转率 2.1，品牌阈值 3.0。",
    )

    assert result == {
        "title": "库存周转偏低",
        "summary": "近 7 日库存周转率低于阈值。",
        "next_action": "优先复核补货节奏。",
    }
    assert captured["api_key"] == "test-key"
    assert captured["base_url"] == "https://api.deepseek.com"
    assert captured["client_timeout"] == 20
    assert captured["model"] == "deepseek-chat"
    assert captured["temperature"] == 0.2
    assert len(captured["messages"]) == 2


def test_diagnosis_llm_service_requires_api_key():
    service = DiagnosisLlmService(
        api_key=None,
        base_url="https://api.deepseek.com",
        model="deepseek-chat",
        timeout_seconds=20,
    )

    with pytest.raises(LlmServiceError, match=r"OPENAI_API_KEY is not configured"):
        service.generate_diagnosis_draft(
            task_id="task-001",
            store_id="SH001",
            diagnosis_type="daily",
            context="库存周转率 2.1，品牌阈值 3.0。",
        )


def test_diagnosis_llm_service_rejects_non_json_response(monkeypatch):
    class DummyCompletions:
        def create(self, **kwargs):
            return type(
                "Response",
                (),
                {
                    "choices": [
                        type(
                            "Choice",
                            (),
                            {
                                "message": type(
                                    "Message",
                                    (),
                                    {"content": "plain text instead of json"},
                                )()
                            },
                        )()
                    ]
                },
            )()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            self.chat = type("Chat", (), {"completions": DummyCompletions()})()

    monkeypatch.setattr("store_ai_clinic.services.llm.OpenAI", DummyOpenAI)

    service = DiagnosisLlmService(
        api_key="test-key",
        base_url="https://api.deepseek.com",
        model="deepseek-chat",
        timeout_seconds=20,
    )

    with pytest.raises(LlmServiceError, match=r"Diagnosis model returned invalid JSON"):
        service.generate_diagnosis_draft(
            task_id="task-001",
            store_id="SH001",
            diagnosis_type="daily",
            context="库存周转率 2.1，品牌阈值 3.0。",
        )
