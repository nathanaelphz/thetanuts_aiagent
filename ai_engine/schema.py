from typing import List

from pydantic import BaseModel, field_validator


class AICandidate(BaseModel):
    ticker: str
    reasoning: str


class AIShortlist(BaseModel):
    candidates: list[AICandidate]


class TradeCandidate(BaseModel):
    ticker: str
    yield_pct: float
    delta: float
    expiry_days: float
    max_collateral_usd: float
    reasoning: str

    @field_validator("reasoning")
    @classmethod
    def reasoning_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("reasoning cannot be empty")
        return v

    @field_validator("delta")
    @classmethod
    def delta_within_cap(cls, v):
        if abs(v) > 0.30:
            raise ValueError(f"delta {v} exceeds the 0.30 risk cap — AI violated its own rule")
        return v

    @field_validator("yield_pct")
    @classmethod
    def yield_meets_minimum(cls, v):
        if v < 3.0:
            raise ValueError(f"yield_pct {v} is below the 3% minimum — AI violated its own rule")
        return v


class RankedCandidates(BaseModel):
    candidates: List[TradeCandidate]
