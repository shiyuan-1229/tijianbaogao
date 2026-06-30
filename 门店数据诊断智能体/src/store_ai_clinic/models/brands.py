from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import utc_now


class Brand(Base):
    __tablename__ = "brands"

    brand_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_name: Mapped[str] = mapped_column(String(120), nullable=False)
    brand_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String(40), nullable=False, default="Asia/Shanghai")
    onboarding_status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class BrandFileTemplate(Base):
    __tablename__ = "brand_file_templates"

    template_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(
        ForeignKey("brands.brand_id"),
        nullable=False,
        index=True,
    )
    report_type: Mapped[str] = mapped_column(String(20), nullable=False)
    template_pattern: Mapped[str] = mapped_column(String(255), nullable=False)
    parse_example_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    sample_file_name: Mapped[str | None] = mapped_column(Text)
