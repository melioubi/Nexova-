from datetime import date, datetime, timezone
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class Country(str, Enum):
    SPAIN = "Spain"
    USA = "USA"


class Currency(str, Enum):
    EUR = "EUR"
    USD = "USD"


class Category(str, Enum):
    JOB_BOARDS = "job_boards"
    ATS_SOFTWARE = "ats_software"
    ASSESSMENT_TOOLS = "assessment_tools"
    TRAINING_PLATFORMS = "training_platforms"
    PAYROLL_AND_HR_SOFTWARE = "payroll_and_hr_software"
    VIDEO_INTERVIEW = "video_interview"
    BACKGROUND_CHECK = "background_check"
    OFFICE_AND_FACILITIES = "office_and_facilities"
    IT_AND_SOFTWARE_LICENSES = "it_and_software_licenses"


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SupplierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=160)
    country: Country
    categories: list[Category] = Field(min_length=1)
    monthly_rate: float = Field(gt=0, allow_inf_nan=False)
    currency: Currency
    status: SupplierStatus
    contract_renewal_date: date | None = None
    contact_email: EmailStr | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_currency_for_country(self):
        expected = Currency.EUR if self.country is Country.SPAIN else Currency.USD
        if self.currency is not expected:
            raise ValueError(f"{self.country.value} suppliers must use {expected.value}")
        return self


class SupplierCreate(SupplierInput):
    pass


class Supplier(SupplierInput):
    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    monthly_rate: float = Field(gt=0, allow_inf_nan=False)


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SupplierStatus


def now_utc() -> datetime:
    return datetime.now(timezone.utc)