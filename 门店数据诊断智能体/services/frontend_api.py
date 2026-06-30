import requests

from store_ai_clinic.config import settings


class FrontendApiError(RuntimeError):
    pass


def _coerce_error_detail(detail: object) -> str | None:
    if isinstance(detail, str) and detail.strip():
        return detail.strip()

    if isinstance(detail, list):
        messages: list[str] = []
        for item in detail:
            if not isinstance(item, dict):
                continue

            location = item.get("loc")
            message = item.get("msg")
            if isinstance(message, str):
                if isinstance(location, list) and location:
                    messages.append(f"{location[-1]}: {message}")
                else:
                    messages.append(message)

        if messages:
            return "; ".join(messages)

    if isinstance(detail, dict):
        message = detail.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()

    return None


def _raise_for_status(response: requests.Response, *, action: str) -> None:
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        message = None
        try:
            payload = response.json()
        except ValueError:
            payload = None

        if isinstance(payload, dict):
            message = _coerce_error_detail(payload.get("detail"))

        if message is None:
            message = f"{action} failed with status {response.status_code}"

        raise FrontendApiError(message) from exc


def _parse_json_response(response: requests.Response, *, action: str) -> dict[str, object]:
    try:
        payload = response.json()
    except ValueError as exc:
        raise FrontendApiError(f"{action} returned an invalid JSON response") from exc

    if not isinstance(payload, dict):
        raise FrontendApiError(f"{action} returned an unexpected response payload")

    return payload


def preview_template(payload: dict[str, object]) -> dict[str, object]:
    response = requests.post(
        f"{settings.api_base_url}/api/onboarding/template-preview",
        json=payload,
        timeout=5,
    )
    _raise_for_status(response, action="Template preview")
    return _parse_json_response(response, action="Template preview")


def preview_batch(payload: dict[str, object]) -> dict[str, object]:
    response = requests.post(
        f"{settings.api_base_url}/api/batches/preview",
        json=payload,
        timeout=5,
    )
    _raise_for_status(response, action="Batch preview")
    return _parse_json_response(response, action="Batch preview")


def run_diagnosis(payload: dict[str, object]) -> dict[str, object]:
    response = requests.post(
        f"{settings.api_base_url}/api/diagnosis/run",
        json=payload,
        timeout=30,
    )
    _raise_for_status(response, action="Diagnosis run")
    return _parse_json_response(response, action="Diagnosis run")
