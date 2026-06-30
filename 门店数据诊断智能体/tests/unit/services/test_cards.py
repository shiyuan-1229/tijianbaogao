import pytest

from store_ai_clinic.services.cards import next_card_status


@pytest.mark.parametrize(
    ("current_status", "action", "expected_status"),
    [
        ("new", "confirm", "pending_review"),
        ("pending_review", "confirm", "processing"),
        ("processing", "complete", "completed"),
        ("pending_review", "ignore", "ignored"),
        ("processing", "escalate", "escalated"),
    ],
)
def test_next_card_status_returns_expected_transition(
    current_status: str,
    action: str,
    expected_status: str,
):
    assert next_card_status(current_status, action) == expected_status


def test_next_card_status_raises_value_error_for_unsupported_transition():
    with pytest.raises(
        ValueError,
        match=r"Unsupported card transition: completed -> confirm",
    ):
        next_card_status("completed", "confirm")
