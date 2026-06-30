from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for ORM models."""


from store_ai_clinic.models import (  # noqa: E402,F401
    alerts,
    brands,
    cards,
    conversations,
    knowledge,
    reviews,
    rules,
    tasks,
)
