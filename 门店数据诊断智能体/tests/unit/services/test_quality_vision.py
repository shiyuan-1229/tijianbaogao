from pathlib import Path
from io import BytesIO
import base64

import pytest
from PIL import Image

from store_ai_clinic.services.quality_vision import QualityVisionAnalyzer, VisionQualityFinding, VisionModelError



def _assert_array_schemas_have_items(schema: object):
    if isinstance(schema, dict):
        if schema.get("type") == "array":
            assert "items" in schema
        for value in schema.values():
            _assert_array_schemas_have_items(value)
    elif isinstance(schema, list):
        for value in schema:
            _assert_array_schemas_have_items(value)
def test_quality_vision_analyzer_sends_image_and_parses_structured_finding(tmp_path: Path, monkeypatch):
    image_path = tmp_path / "report-page.png"
    image_path.write_bytes(b"\x89PNG\r\n\x1a\nimage-bytes")
    captured: dict[str, object] = {}

    class DummyResponses:
        def create(self, **kwargs):
            captured.update(kwargs)
            return type(
                "Response",
                (),
                {
                    "output_text": (
                        '{"issue_type":"AI 视觉判断","severity":"high",'
                        '"evidence":"图片识别到血红蛋白 88 g/L，低于参考范围。",'
                        '"ai_judgement":"疑似贫血相关异常。",'
                        '"recommendation":"复核血常规页。",'
                        '"finding_type":"data_error","bbox":[12,18,36,14],"confidence":0.88}'
                    )
                },
            )()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            captured["api_key"] = api_key
            captured["base_url"] = base_url
            captured["client_timeout"] = timeout
            self.responses = DummyResponses()

    monkeypatch.setattr("store_ai_clinic.services.quality_vision.OpenAI", DummyOpenAI)

    analyzer = QualityVisionAnalyzer(
        api_key="test-key",
        base_url="https://api.openai.com/v1",
        model="gpt-4.1-mini",
        timeout_seconds=30,
    )

    result = analyzer.analyze_image(image_path)

    assert result == VisionQualityFinding(
        issue_type="AI 视觉判断",
        severity="high",
        evidence="图片识别到血红蛋白 88 g/L，低于参考范围。",
        ai_judgement="疑似贫血相关异常。",
        recommendation="复核血常规页。",
        confidence=0.88,
        finding_type="data_error",
        bbox=[12.0, 18.0, 36.0, 14.0],
    )
    assert captured["model"] == "gpt-4.1-mini"
    assert captured["api_key"] == "test-key"
    assert captured["base_url"] == "https://api.openai.com/v1"
    assert captured["client_timeout"] == 30
    assert captured["text"]["format"]["type"] == "json_schema"
    _assert_array_schemas_have_items(captured["text"]["format"]["schema"])
    image_blocks = [
        content
        for message in captured["input"]
        for content in message["content"]
        if content["type"] == "input_image"
    ]
    assert image_blocks[0]["image_url"].startswith("data:image/png;base64,")


def test_quality_vision_analyzer_compresses_large_images_before_sending(tmp_path: Path, monkeypatch):
    image_path = tmp_path / "large-report-page.png"
    Image.effect_noise((2400, 1800), 100).convert("RGB").save(image_path, format="PNG")
    captured: dict[str, object] = {}

    class DummyResponses:
        def create(self, **kwargs):
            captured.update(kwargs)
            return type(
                "Response",
                (),
                {
                    "output_text": (
                        '{"has_finding":false,"issue_type":"No actionable finding","severity":"low",'
                        '"evidence":"No clear issue is visible.",'
                        '"ai_judgement":"No actionable finding.",'
                        '"recommendation":"Continue review.",'
                        '"finding_type":"other","bbox":null,"confidence":0.2}'
                    )
                },
            )()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            self.responses = DummyResponses()

    monkeypatch.setattr("store_ai_clinic.services.quality_vision.OpenAI", DummyOpenAI)

    analyzer = QualityVisionAnalyzer(
        api_key="test-key",
        base_url="https://api.openai.com/v1",
        model="gpt-4.1-mini",
        timeout_seconds=30,
    )

    analyzer.analyze_image(image_path)

    image_block = next(
        content
        for message in captured["input"]
        for content in message["content"]
        if content["type"] == "input_image"
    )
    image_url = image_block["image_url"]
    assert image_url.startswith("data:image/jpeg;base64,")
    encoded = image_url.removeprefix("data:image/jpeg;base64,")
    compressed = base64.b64decode(encoded)
    with Image.open(BytesIO(compressed)) as sent_image:
        assert sent_image.format == "JPEG"
        assert max(sent_image.size) <= 1600




def test_quality_vision_analyzer_falls_back_to_chat_completions(tmp_path: Path, monkeypatch):
    image_path = tmp_path / "report-page.png"
    image_path.write_bytes(b"\x89PNG\r\n\x1a\nimage-bytes")
    captured: dict[str, object] = {}

    class DummyResponses:
        def create(self, **_kwargs):
            raise RuntimeError("responses endpoint is not supported")

    class DummyChatCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            message = type(
                "Message",
                (),
                {
                    "content": (
                        '{"issue_type":"未脱敏信息","severity":"high",'
                        '"evidence":"页面顶部出现完整姓名和身份证号。",'
                        '"ai_judgement":"疑似隐私信息未脱敏，需要人工复核。",'
                        '"recommendation":"遮盖姓名和证件号后重新入库。",'
                        '"finding_type":"privacy_leak","bbox":[8,6,28,10],"confidence":0.91}'
                    )
                },
            )()
            choice = type("Choice", (), {"message": message})()
            return type("ChatResponse", (), {"choices": [choice]})()

    class DummyChat:
        def __init__(self):
            self.completions = DummyChatCompletions()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            captured["api_key"] = api_key
            captured["base_url"] = base_url
            captured["client_timeout"] = timeout
            self.responses = DummyResponses()
            self.chat = DummyChat()

    monkeypatch.setattr("store_ai_clinic.services.quality_vision.OpenAI", DummyOpenAI)

    analyzer = QualityVisionAnalyzer(
        api_key="test-key",
        base_url="https://compatible.example/v1",
        model="vision-chat-model",
        timeout_seconds=30,
    )

    result = analyzer.analyze_image(image_path)

    assert result == VisionQualityFinding(
        issue_type="未脱敏信息",
        severity="high",
        evidence="页面顶部出现完整姓名和身份证号。",
        ai_judgement="疑似隐私信息未脱敏，需要人工复核。",
        recommendation="遮盖姓名和证件号后重新入库。",
        confidence=0.91,
        finding_type="privacy_leak",
        bbox=[8.0, 6.0, 28.0, 10.0],
    )
    assert captured["model"] == "vision-chat-model"
    assert captured["response_format"] == {"type": "json_object"}
    user_message = captured["messages"][1]
    assert user_message["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")
def test_quality_vision_analyzer_accepts_missing_text_and_history_gap_findings(tmp_path: Path, monkeypatch):
    page_paths = []
    for page_number in range(1, 3):
        image_path = tmp_path / f"page-{page_number}.png"
        image_path.write_bytes(b"\x89PNG\r\n\x1a\nimage-bytes")
        page_paths.append(image_path)

    class DummyResponses:
        def create(self, **_kwargs):
            return type(
                "Response",
                (),
                {
                    "output_text": (
                        '{"findings":['
                        '{"page":1,"has_finding":true,"issue_type":"疑似缺字","severity":"high",'
                        '"evidence":"检验结果栏有关键字缺损，无法完整确认项目名称。",'
                        '"ai_judgement":"页面存在疑似缺字，需要人工复核原图。",'
                        '"recommendation":"查看框选区域，回查原 PDF 或重新扫描件。",'
                        '"finding_type":"missing_text","bbox":[12,18,30,8],"confidence":0.9},'
                        '{"page":2,"has_finding":true,"issue_type":"历史对比缺失","severity":"medium",'
                        '"evidence":"页面写有历史对比，但未展示历史指标或对比表。",'
                        '"ai_judgement":"历史对比证据缺失，需要人工确认。",'
                        '"recommendation":"回查同一档案号历史报告和结构化数据。",'
                        '"finding_type":"history_gap","bbox":[18,48,45,10],"confidence":0.86}'
                        ']}'
                    )
                },
            )()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            self.responses = DummyResponses()

    monkeypatch.setattr("store_ai_clinic.services.quality_vision.OpenAI", DummyOpenAI)

    analyzer = QualityVisionAnalyzer(
        api_key="test-key",
        base_url="https://api.openai.com/v1",
        model="gpt-4.1-mini",
        timeout_seconds=30,
    )

    findings = analyzer.analyze_images(page_paths)

    assert [(page, finding.finding_type) for page, finding in findings] == [
        (1, "missing_text"),
        (2, "history_gap"),
    ]
def test_quality_vision_analyzer_requires_api_key(tmp_path: Path):
    analyzer = QualityVisionAnalyzer(
        api_key=None,
        base_url="https://api.openai.com/v1",
        model="gpt-4.1-mini",
        timeout_seconds=30,
    )

    with pytest.raises(VisionModelError, match="OPENAI_API_KEY is not configured"):
        analyzer.analyze_image(tmp_path / "report-page.png")




def test_quality_vision_analyzer_sends_multiple_pages_in_one_request(tmp_path: Path, monkeypatch):
    page_paths = []
    for page_number in range(1, 4):
        image_path = tmp_path / f"page-{page_number}.png"
        image_path.write_bytes(b"\x89PNG\r\n\x1a\nimage-bytes")
        page_paths.append(image_path)
    captured: dict[str, object] = {}

    class DummyResponses:
        def create(self, **kwargs):
            captured.update(kwargs)
            return type(
                "Response",
                (),
                {
                    "output_text": (
                        '{"findings":['
                        '{"page":2,"has_finding":true,"issue_type":"Glucose value needs review","severity":"high",'
                        '"evidence":"Page 2 shows glucose 12.8 above reference range.",'
                        '"ai_judgement":"The visible value needs content-level review.",'
                        '"recommendation":"Review page 2 and compare structured data.",'
                        '"finding_type":"data_error","bbox":[16,42,28,8],"confidence":0.92}'
                        ']}'
                    )
                },
            )()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            self.responses = DummyResponses()

    monkeypatch.setattr("store_ai_clinic.services.quality_vision.OpenAI", DummyOpenAI)

    analyzer = QualityVisionAnalyzer(
        api_key="test-key",
        base_url="https://api.openai.com/v1",
        model="gpt-4.1-mini",
        timeout_seconds=30,
    )

    results = analyzer.analyze_images(page_paths)

    assert [page_number for page_number, _finding in results] == [2]
    assert results[0][1].issue_type == "Glucose value needs review"
    user_blocks = captured["input"][1]["content"]
    image_blocks = [block for block in user_blocks if block["type"] == "input_image"]
    assert len(image_blocks) == 3
    assert all(block["image_url"].startswith("data:image/png;base64,") for block in image_blocks)


def test_quality_vision_analyzer_can_return_non_actionable_page(tmp_path: Path, monkeypatch):
    image_path = tmp_path / "blank-page.png"
    image_path.write_bytes(b"\x89PNG\r\n\x1a\nimage-bytes")

    class DummyResponses:
        def create(self, **_kwargs):
            return type(
                "Response",
                (),
                {
                    "output_text": (
                        '{"has_finding":false,"issue_type":"No actionable finding","severity":"low",'
                        '"evidence":"Only a blank or non-report page is visible.",'
                        '"ai_judgement":"There is not enough visible report content for a content-level quality issue.",'
                        '"recommendation":"Continue reviewing other pages or ask a human to verify the upload.",'
                        '"finding_type":"other","bbox":null,"confidence":0.2}'
                    )
                },
            )()

    class DummyOpenAI:
        def __init__(self, *, api_key: str, base_url: str, timeout: int):
            self.responses = DummyResponses()

    monkeypatch.setattr("store_ai_clinic.services.quality_vision.OpenAI", DummyOpenAI)

    analyzer = QualityVisionAnalyzer(
        api_key="test-key",
        base_url="https://api.openai.com/v1",
        model="gpt-4.1-mini",
        timeout_seconds=30,
    )

    result = analyzer.analyze_image(image_path)

    assert result.has_finding is False
    assert result.finding_type == "other"
    assert result.bbox is None

