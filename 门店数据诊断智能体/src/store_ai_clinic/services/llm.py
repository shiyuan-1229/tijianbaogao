import json
import logging
from dataclasses import dataclass
from json import JSONDecodeError
from typing import TypedDict

from store_ai_clinic.config import settings

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

logger = logging.getLogger(__name__)


class DiagnosisDraft(TypedDict):
    title: str
    summary: str
    next_action: str


class LlmServiceError(RuntimeError):
    """Raised when the diagnosis model cannot return a usable draft."""


@dataclass(slots=True)
class DiagnosisLlmService:
    api_key: str | None
    base_url: str
    model: str
    timeout_seconds: int = 20

    @classmethod
    def from_settings(cls) -> "DiagnosisLlmService":
        return cls(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            timeout_seconds=settings.openai_timeout_seconds,
        )

    def _build_client(self):
        if not self.api_key:
            raise LlmServiceError("OPENAI_API_KEY is not configured")
        if OpenAI is None:
            raise LlmServiceError("openai package is not installed")

        logger.info(
            "Initializing OpenAI client api_key_loaded=%s api_key_length=%s api_key_prefix=%s "
            "api_key_suffix=%s base_url=%s timeout_seconds=%s",
            True,
            len(self.api_key),
            self.api_key[:8],
            self.api_key[-4:],
            self.base_url,
            self.timeout_seconds,
        )

        return OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=self.timeout_seconds,
        )

    def generate_diagnosis_draft(
        self,
        *,
        task_id: str,
        store_id: str,
        diagnosis_type: str,
        context: str | None,
    ) -> DiagnosisDraft:
        client = self._build_client()
        prompt_context = context.strip() if context else "当前没有额外上下文，请基于任务元信息返回保守草案。"

        try:
            response = client.chat.completions.create(
                model=self.model,
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是门店经营诊断助手。"
                            "请仅输出 JSON 对象，字段必须包含 title、summary、next_action。"
                            "不要输出 Markdown，不要输出额外解释。"
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"任务 ID: {task_id}\n"
                            f"门店 ID: {store_id}\n"
                            f"诊断类型: {diagnosis_type}\n"
                            f"诊断上下文: {prompt_context}"
                        ),
                    },
                ],
            )
        except Exception as exc:
            raise LlmServiceError(str(exc)) from exc

        try:
            content = response.choices[0].message.content
        except (AttributeError, IndexError) as exc:
            raise LlmServiceError("Diagnosis model returned an empty response") from exc

        if not isinstance(content, str) or not content.strip():
            raise LlmServiceError("Diagnosis model returned an empty response")

        try:
            payload = json.loads(content)
        except JSONDecodeError as exc:
            raise LlmServiceError("Diagnosis model returned invalid JSON") from exc

        if not isinstance(payload, dict):
            raise LlmServiceError("Diagnosis model returned an unexpected payload")

        missing_fields = [
            field_name
            for field_name in ("title", "summary", "next_action")
            if not isinstance(payload.get(field_name), str) or not payload[field_name].strip()
        ]
        if missing_fields:
            missing_fields_text = ", ".join(missing_fields)
            raise LlmServiceError(
                f"Diagnosis model payload is missing required fields: {missing_fields_text}"
            )

        return DiagnosisDraft(
            title=str(payload["title"]).strip(),
            summary=str(payload["summary"]).strip(),
            next_action=str(payload["next_action"]).strip(),
        )
