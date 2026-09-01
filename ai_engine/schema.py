from typing import List

from pydantic import BaseModel, field_validator


class AICandidate(BaseModel):
    ticker: str
    reasoning: str


class AIShortlist(BaseModel):
    candidates: list[AICandidate]


class TradeCandidate(BaseModel):
    ticker: str
    cost_per_delta: float | None
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
    def delta_within_range(cls, v):
        if not (0.15 <= abs(v) <= 0.40):
            raise ValueError(f"delta {v} is outside the 0.15-0.40 buyer range — AI violated its own rule")
        return v

    @field_validator("cost_per_delta")
    @classmethod
    def cost_per_delta_required(cls, v):
        if v is None:
            raise ValueError("cost_per_delta cannot be None — AI violated its own rule")
        return v


class RankedCandidates(BaseModel):
    candidates: List[TradeCandidate]
