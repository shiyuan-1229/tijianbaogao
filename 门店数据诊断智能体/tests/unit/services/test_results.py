import pytest

from store_ai_clinic.services.results import diff_card_sets


def test_diff_card_sets_returns_added_removed_and_changed_cards():
    previous = [
        {"card_id": "card-1", "status": "pending_review", "score": 80},
        {"card_id": "card-2", "status": "processing", "score": 60},
    ]
    current = [
        {"card_id": "card-1", "status": "completed", "score": 80},
        {"card_id": "card-3", "status": "new", "score": 95},
    ]

    diff = diff_card_sets(previous, current)

    assert diff == {
        "added": [{"card_id": "card-3", "status": "new", "score": 95}],
        "removed": [{"card_id": "card-2", "status": "processing", "score": 60}],
        "changed": [
            {
                "before": {"card_id": "card-1", "status": "pending_review", "score": 80},
                "after": {"card_id": "card-1", "status": "completed", "score": 80},
            }
        ],
    }


def test_diff_card_sets_returns_empty_groups_when_sets_match():
    cards = [{"card_id": "card-1", "status": "completed"}]

    diff = diff_card_sets(cards, list(cards))

    assert diff == {"added": [], "removed": [], "changed": []}


@pytest.mark.parametrize(
    ("previous", "current", "expected_message"),
    [
        (
            [
                {"card_id": "card-1", "status": "pending_review"},
                {"card_id": "card-1", "status": "processing"},
            ],
            [{"card_id": "card-2", "status": "completed"}],
            r"Duplicate card_id in previous cards: card-1",
        ),
        (
            [{"card_id": "card-1", "status": "pending_review"}],
            [
                {"card_id": "card-2", "status": "processing"},
                {"card_id": "card-2", "status": "completed"},
            ],
            r"Duplicate card_id in current cards: card-2",
        ),
    ],
)
def test_diff_card_sets_rejects_duplicate_card_ids(previous, current, expected_message):
    with pytest.raises(ValueError, match=expected_message):
        diff_card_sets(previous, current)
