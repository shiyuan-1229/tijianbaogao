from typing import Literal

from pydantic import BaseModel

from store_ai_clinic.models.enums import CardStatus as CardStatusEnum


CardAction = Literal["confirm", "complete", "ignore", "escalate"]


class CardStatus(BaseModel):
    status: CardStatusEnum


class CardTransitionRequest(BaseModel):
    current_status: CardStatusEnum
    action: CardAction
