from dataclasses import dataclass


@dataclass(slots=True)
class ConversationLlmScaffold:
    """Task 3 placeholder for snapshot compression without real model calls."""

    model_name: str = "placeholder-conversation-v1"

    def compress_snapshot(
        self,
        *,
        existing_summary: str,
        transcript_text: str,
    ) -> dict[str, object]:
        condensed = transcript_text.strip()
        if len(condensed) > 280:
            condensed = condensed[:277].rstrip() + "..."
        summary_text = existing_summary.strip() if existing_summary.strip() else condensed
        return {
            "summary_text": summary_text,
            "summary_json": {
                "model_name": self.model_name,
                "compression_mode": "placeholder",
                "transcript_excerpt": condensed,
            },
        }
