from store_ai_clinic.models.enums import ReviewResolution


def build_resume_payload(
    task_id: str,
    resolution: ReviewResolution,
    remark: str,
) -> dict[str, object]:
    return {
        "task_id": task_id,
        "resolution": resolution,
        "remark": remark,
        "resume_from_checkpoint": True,
    }
