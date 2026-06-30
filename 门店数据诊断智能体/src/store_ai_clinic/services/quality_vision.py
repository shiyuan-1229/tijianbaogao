from __future__ import annotations

import base64
import json
import mimetypes
from io import BytesIO
from dataclasses import dataclass
from json import JSONDecodeError
from pathlib import Path
from typing import Literal

from store_ai_clinic.config import settings

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - covered by runtime guard
    OpenAI = None
try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - image compression is best-effort
    Image = None
    ImageOps = None

VisionSeverity = Literal["high", "medium", "low"]
VisionFindingType = Literal["data_error", "missing_text", "privacy_leak", "history_gap", "format", "other"]
MAX_VISION_IMAGE_EDGE = 1600
MIN_COMPRESS_IMAGE_BYTES = 512 * 1024
VISION_IMAGE_JPEG_QUALITY = 78
SYSTEM_PROMPT = (
    "你是体检报告质检助手。请只基于图片中可见内容输出结构化 JSON。"
    "如果无法确定具体异常，也要说明证据不足，不要臆造数值。"
    "所有结论都必须保留人工复核口径。"
)
USER_PROMPT = (
    "Analyze this physical examination report page. Determine whether the visible content contains a clear "
    "content-level data error, suspected missing text, privacy leak, missing or contradictory history comparison, page-count or page-format boundary issue. "
    "Return has_finding, issue_type, severity, evidence, ai_judgement, recommendation, confidence, finding_type, bbox. "
    "Set has_finding to true only when a specific visible issue can be located; blank pages, covers, evidence gaps, "
    "or uncertain pages must return has_finding=false. "
    "finding_type must be one of data_error, missing_text, privacy_leak, history_gap, format, other. Use missing_text for broken, cropped, obscured, or unreadable key text; privacy_leak for visible names, ID numbers, phone numbers, institutions, doctors, or other sensitive identifiers; history_gap for reports that claim or require historical comparison but do not show usable historical evidence; format for page-count boundaries, cropped pages, rotation, blank pages, or scan layout issues. "
    "bbox is [left, top, width, height] in page percentages, or null when no exact location exists."
)
BATCH_USER_PROMPT = (
    "Analyze these physical examination report pages in image order; page numbers start at 1. "
    "Find every page with a clear visible content-level data error, suspected missing text, privacy leak, missing or contradictory history comparison, page-count or page-format boundary issue. "
    "Return only actionable findings. Do not return blank pages, covers, evidence gaps, or uncertain pages as findings. "
    "Return a JSON object with findings as an array. Each finding must include page, has_finding, issue_type, severity, "
    "evidence, ai_judgement, recommendation, confidence, finding_type, bbox. "
    "bbox is [left, top, width, height] in that page's percentages, or null when no exact location exists."
)



class VisionModelError(RuntimeError):
    """Raised when the report vision model cannot produce a usable finding."""


@dataclass(frozen=True)
class VisionQualityFinding:
    issue_type: str
    severity: VisionSeverity
    evidence: str
    ai_judgement: str
    recommendation: str
    confidence: float
    finding_type: VisionFindingType = "data_error"
    bbox: list[float] | None = None
    has_finding: bool = True


@dataclass(slots=True)
class QualityVisionAnalyzer:
    api_key: str | None
    base_url: str
    model: str
    timeout_seconds: int = 30

    @classmethod
    def from_settings(cls) -> "QualityVisionAnalyzer":
        return cls(
            api_key=settings.openai_api_key,
            base_url=settings.openai_vision_base_url,
            model=settings.openai_vision_model,
            timeout_seconds=settings.openai_timeout_seconds,
        )

    def analyze_image(self, image_path: Path) -> VisionQualityFinding:
        if not self.api_key:
            raise VisionModelError("OPENAI_API_KEY is not configured")
        if OpenAI is None:
            raise VisionModelError("openai package is not installed")
        if not image_path.exists() or not image_path.is_file():
            raise VisionModelError(f"Image file does not exist: {image_path}")

        client = OpenAI(api_key=self.api_key, base_url=self.base_url, timeout=self.timeout_seconds)
        image_url = _image_data_url(image_path)
        try:
            response = _create_responses_finding(client, self.model, image_url)
            return _parse_finding(_response_text(response))
        except Exception as responses_exc:
            try:
                response = _create_chat_finding(client, self.model, image_url)
                return _parse_finding(_chat_response_text(response))
            except Exception as chat_exc:  # pragma: no cover - exercised via integration failures
                raise VisionModelError(
                    f"Vision model failed via responses and chat completions: {responses_exc}; {chat_exc}"
                ) from chat_exc

    def analyze_images(self, image_paths: list[Path]) -> list[tuple[int, VisionQualityFinding]]:
        if not image_paths:
            return []
        if not self.api_key:
            raise VisionModelError("OPENAI_API_KEY is not configured")
        if OpenAI is None:
            raise VisionModelError("openai package is not installed")
        for image_path in image_paths:
            if not image_path.exists() or not image_path.is_file():
                raise VisionModelError(f"Image file does not exist: {image_path}")

        client = OpenAI(api_key=self.api_key, base_url=self.base_url, timeout=self.timeout_seconds)
        image_urls = [_image_data_url(image_path) for image_path in image_paths]
        try:
            response = _create_responses_page_findings(client, self.model, image_urls)
            return _parse_page_findings(_response_text(response), len(image_paths))
        except Exception as responses_exc:
            try:
                response = _create_chat_page_findings(client, self.model, image_urls)
                return _parse_page_findings(_chat_response_text(response), len(image_paths))
            except Exception as chat_exc:  # pragma: no cover - exercised via integration failures
                raise VisionModelError(
                    f"Vision model failed via responses and chat completions: {responses_exc}; {chat_exc}"
                ) from chat_exc


def _image_data_url(image_path: Path) -> str:
    media_type, payload = _image_payload_for_model(image_path)
    encoded = base64.b64encode(payload).decode("ascii")
    return f"data:{media_type};base64,{encoded}"


def _image_payload_for_model(image_path: Path) -> tuple[str, bytes]:
    media_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    original = image_path.read_bytes()
    compressed = _compress_image_for_model(original)
    if compressed is None:
        return media_type, original
    return "image/jpeg", compressed


def _compress_image_for_model(image_bytes: bytes) -> bytes | None:
    if Image is None or ImageOps is None:
        return None

    try:
        with Image.open(BytesIO(image_bytes)) as source_image:
            image = ImageOps.exif_transpose(source_image)
            should_compress = max(image.size) > MAX_VISION_IMAGE_EDGE or len(image_bytes) > MIN_COMPRESS_IMAGE_BYTES
            if not should_compress:
                return None
            image.thumbnail((MAX_VISION_IMAGE_EDGE, MAX_VISION_IMAGE_EDGE), Image.Resampling.LANCZOS)
            if image.mode != "RGB":
                image = image.convert("RGB")
            output = BytesIO()
            image.save(output, format="JPEG", quality=VISION_IMAGE_JPEG_QUALITY, optimize=True)
    except Exception:
        return None

    compressed = output.getvalue()
    return compressed if compressed and len(compressed) < len(image_bytes) else None


def _create_responses_finding(client: object, model: str, image_url: str) -> object:
    return client.responses.create(
        model=model,
        temperature=0,
        input=[
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": SYSTEM_PROMPT,
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": USER_PROMPT,
                    },
                    {"type": "input_image", "image_url": image_url},
                ],
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "quality_vision_finding",
                "strict": True,
                "schema": _finding_schema(),
            }
        },
    )


def _create_chat_finding(client: object, model: str, image_url: str) -> object:
    return client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": USER_PROMPT},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            },
        ],
        response_format={"type": "json_object"},
    )

def _create_responses_page_findings(client: object, model: str, image_urls: list[str]) -> object:
    content: list[dict[str, str]] = [{"type": "input_text", "text": BATCH_USER_PROMPT}]
    content.extend({"type": "input_image", "image_url": image_url} for image_url in image_urls)
    return client.responses.create(
        model=model,
        temperature=0,
        input=[
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": SYSTEM_PROMPT,
                    }
                ],
            },
            {"role": "user", "content": content},
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "quality_vision_page_findings",
                "strict": True,
                "schema": _page_findings_schema(),
            }
        },
    )


def _create_chat_page_findings(client: object, model: str, image_urls: list[str]) -> object:
    content: list[dict[str, object]] = [{"type": "text", "text": BATCH_USER_PROMPT}]
    content.extend({"type": "image_url", "image_url": {"url": image_url}} for image_url in image_urls)
    return client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
    )


def _response_text(response: object) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text
    raise VisionModelError("Vision model returned an empty response")


def _chat_response_text(response: object) -> str:
    choices = getattr(response, "choices", None)
    if not choices:
        raise VisionModelError("Vision chat model returned no choices")
    message = getattr(choices[0], "message", None)
    content = getattr(message, "content", None)
    if isinstance(content, str) and content.strip():
        return content
    raise VisionModelError("Vision chat model returned an empty response")


def _parse_finding(raw_text: str) -> VisionQualityFinding:
    payload = _json_object(raw_text)
    return _parse_finding_payload(payload)


def _parse_page_findings(raw_text: str, page_count: int) -> list[tuple[int, VisionQualityFinding]]:
    payload = _json_object(raw_text)
    findings = payload.get("findings")
    if not isinstance(findings, list):
        raise VisionModelError("Vision model page payload is missing findings")
    parsed: list[tuple[int, VisionQualityFinding]] = []
    for finding_payload in findings:
        if not isinstance(finding_payload, dict):
            raise VisionModelError("Vision model page payload has invalid finding")
        page = finding_payload.get("page")
        if not isinstance(page, int) or page < 1 or page > page_count:
            raise VisionModelError("Vision model page payload has invalid page")
        finding = _parse_finding_payload(finding_payload)
        if finding.has_finding:
            parsed.append((page, finding))
    return parsed


def _json_object(raw_text: str) -> dict[str, object]:
    try:
        payload = json.loads(raw_text)
    except JSONDecodeError as exc:
        raise VisionModelError("Vision model returned invalid JSON") from exc
    if not isinstance(payload, dict):
        raise VisionModelError("Vision model returned an unexpected payload")
    return payload


def _parse_finding_payload(payload: dict[str, object]) -> VisionQualityFinding:
    required_strings = ["issue_type", "severity", "evidence", "ai_judgement", "recommendation"]
    missing = [field for field in required_strings if not isinstance(payload.get(field), str) or not payload[field].strip()]
    if missing:
        raise VisionModelError("Vision model payload is missing required fields: " + ", ".join(missing))

    severity = payload["severity"].strip()
    if severity not in {"high", "medium", "low"}:
        raise VisionModelError("Vision model payload has invalid severity")

    confidence = payload.get("confidence")
    if not isinstance(confidence, int | float):
        raise VisionModelError("Vision model payload has invalid confidence")

    finding_type = payload.get("finding_type", "data_error")
    if finding_type not in {"data_error", "missing_text", "privacy_leak", "history_gap", "format", "other"}:
        raise VisionModelError("Vision model payload has invalid finding_type")

    has_finding = payload.get("has_finding", True)
    if not isinstance(has_finding, bool):
        raise VisionModelError("Vision model payload has invalid has_finding")

    bbox = payload.get("bbox")
    if bbox is not None:
        if not isinstance(bbox, list) or len(bbox) != 4 or not all(isinstance(value, int | float) for value in bbox):
            raise VisionModelError("Vision model payload has invalid bbox")
        bbox = [float(value) for value in bbox]

    return VisionQualityFinding(
        issue_type=payload["issue_type"].strip(),
        severity=severity,
        evidence=payload["evidence"].strip(),
        ai_judgement=payload["ai_judgement"].strip(),
        recommendation=payload["recommendation"].strip(),
        confidence=max(0.0, min(1.0, float(confidence))),
        finding_type=finding_type,
        bbox=bbox,
        has_finding=has_finding,
    )


def _finding_schema() -> dict[str, object]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "has_finding": {"type": "boolean"},
            "issue_type": {"type": "string"},
            "severity": {"type": "string", "enum": ["high", "medium", "low"]},
            "evidence": {"type": "string"},
            "ai_judgement": {"type": "string"},
            "recommendation": {"type": "string"},
            "finding_type": {"type": "string", "enum": ["data_error", "missing_text", "privacy_leak", "history_gap", "format", "other"]},
            "bbox": {
                "anyOf": [
                    {
                        "type": "array",
                        "items": {"type": "number", "minimum": 0, "maximum": 100},
                        "minItems": 4,
                        "maxItems": 4,
                    },
                    {"type": "null"},
                ]
            },
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["has_finding", "issue_type", "severity", "evidence", "ai_judgement", "recommendation", "finding_type", "bbox", "confidence"],
    }


def _page_findings_schema() -> dict[str, object]:
    finding_schema = _finding_schema()
    properties = dict(finding_schema["properties"])
    properties["page"] = {"type": "integer", "minimum": 1}
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": properties,
                    "required": ["page", *finding_schema["required"]],
                },
            }
        },
        "required": ["findings"],
    }




