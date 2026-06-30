from fastapi import APIRouter, HTTPException

from store_ai_clinic.schemas.cards import CardStatus, CardTransitionRequest
from store_ai_clinic.services.cards import InvalidCardTransitionError, next_card_status


router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.post("/transition", response_model=CardStatus)
def transition_card(request: CardTransitionRequest) -> CardStatus:
    try:
        return CardStatus(
            status=next_card_status(
                current_status=request.current_status,
                action=request.action,
            )
        )
    except InvalidCardTransitionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
