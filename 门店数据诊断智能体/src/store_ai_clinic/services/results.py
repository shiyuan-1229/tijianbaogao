def _index_cards(
    cards: list[dict[str, object]],
    label: str,
) -> dict[object, dict[str, object]]:
    indexed_cards: dict[object, dict[str, object]] = {}

    for card in cards:
        card_id = card["card_id"]
        if card_id in indexed_cards:
            raise ValueError(f"Duplicate card_id in {label} cards: {card_id}")
        indexed_cards[card_id] = card

    return indexed_cards


def diff_card_sets(
    previous: list[dict[str, object]],
    current: list[dict[str, object]],
) -> dict[str, list[dict[str, object]]]:
    previous_by_id = _index_cards(previous, "previous")
    current_by_id = _index_cards(current, "current")

    added = [card for card in current if card["card_id"] not in previous_by_id]
    removed = [card for card in previous if card["card_id"] not in current_by_id]
    changed = [
        {"before": previous_by_id[card["card_id"]], "after": card}
        for card in current
        if card["card_id"] in previous_by_id and previous_by_id[card["card_id"]] != card
    ]

    return {"added": added, "removed": removed, "changed": changed}
