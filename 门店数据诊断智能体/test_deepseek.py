import os
import sys
from itertools import product

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(dotenv_path=".env", override=True)


def mask_secret(value: str | None) -> dict[str, object]:
    if not value:
        return {
            "loaded": False,
            "length": 0,
            "prefix": "",
            "suffix": "",
        }

    return {
        "loaded": True,
        "length": len(value),
        "prefix": value[:8],
        "suffix": value[-4:],
    }


def run_probe(api_key: str | None, base_url: str, model: str) -> tuple[bool, str]:
    client = OpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=20,
    )
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "hello"},
            ],
        )
        return True, response.model_dump_json(indent=2)
    except Exception as exc:  # pragma: no cover - used for manual diagnostics
        return False, repr(exc)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")

    env_base_url = os.getenv("OPENAI_BASE_URL") or "https://api.deepseek.com"
    env_model = os.getenv("OPENAI_MODEL") or "deepseek-chat"
    api_key = os.getenv("OPENAI_API_KEY")

    print("Resolved OPENAI_API_KEY:", mask_secret(api_key))
    print("Resolved OPENAI_BASE_URL:", env_base_url)
    print("Resolved OPENAI_MODEL:", env_model)

    base_urls = []
    for candidate in (
        env_base_url,
        "https://api.deepseek.com",
        "https://api.deepseek.com/v1",
    ):
        if candidate not in base_urls:
            base_urls.append(candidate)

    models = []
    for candidate in (
        env_model,
        "deepseek-chat",
        "deepseek-reasoner",
    ):
        if candidate not in models:
            models.append(candidate)

    for base_url, model in product(base_urls, models):
        print(f"\n=== Testing base_url={base_url} model={model} ===")
        ok, payload = run_probe(api_key, base_url, model)
        print(payload)
        if ok:
            print("RESULT: SUCCESS")
        else:
            print("RESULT: FAILED")


if __name__ == "__main__":
    main()
