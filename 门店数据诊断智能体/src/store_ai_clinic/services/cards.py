from store_ai_clinic.models.enums import CardStatus


class InvalidCardTransitionError(ValueError):
    """Raised when a card action is not allowed for the current status."""


TRANSITIONS: dict[tuple[CardStatus, str], CardStatus] = {
    (CardStatus.NEW, "confirm"): CardStatus.PENDING_REVIEW,
    (CardStatus.PENDING_REVIEW, "confirm"): CardStatus.PROCESSING,
    (CardStatus.PROCESSING, "complete"): CardStatus.COMPLETED,
    (CardStatus.PENDING_REVIEW, "ignore"): CardStatus.IGNORED,
    (CardStatus.PROCESSING, "escalate"): CardStatus.ESCALATED,
}


def next_card_status(current_status: CardStatus | str, action: str) -> str:
    normalized_status = CardStatus(current_status)

    try:
        return TRANSITIONS[(normalized_status, action)].value
    except KeyError as exc:
        raise InvalidCardTransitionError(
            f"Unsupported card transition: {normalized_status.value} -> {action}"
        ) from exc
