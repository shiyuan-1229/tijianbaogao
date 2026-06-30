import re


REQUIRED_TOKENS = ("brand_code", "store_code", "biz_date", "report_type")
SUPPORTED_REPORT_TYPES = ("daily", "weekly")
TOKEN_RE = re.compile(r"{([a-z_]+)}")


def preview_template_parse(pattern: str) -> dict[str, object]:
    found_tokens = TOKEN_RE.findall(pattern)
    required_tokens = [token for token in REQUIRED_TOKENS if token in found_tokens]
    missing_tokens = [token for token in REQUIRED_TOKENS if token not in found_tokens]
    unsupported_tokens = [token for token in found_tokens if token not in REQUIRED_TOKENS]

    if missing_tokens:
        missing_text = ", ".join(missing_tokens)
        raise ValueError(f"Template pattern is missing required tokens: {missing_text}")

    if unsupported_tokens:
        unsupported_text = ", ".join(unsupported_tokens)
        raise ValueError(f"Template pattern contains unsupported tokens: {unsupported_text}")

    example = pattern.format(
        brand_code="acme",
        store_code="SH001",
        biz_date="20260609",
        report_type="daily",
    )

    return {
        "required_tokens": required_tokens,
        "report_types": list(SUPPORTED_REPORT_TYPES),
        "example": example,
    }
