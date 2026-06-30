from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import utc_now


class BrandRuleBundle(Base):
    __tablename__ = "brand_rule_bundles"

    bundle_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(
        ForeignKey("brands.brand_id"),
        nullable=False,
        index=True,
    )
    bundle_version: Mapped[str] = mapped_column(String(40), nullable=False)
    strategy_version: Mapped[str] = mapped_column(String(40), nullable=False)
    rules_snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_by: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text)
