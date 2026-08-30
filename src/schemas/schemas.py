# Market & Options Data Contracts
# Shared contract between the TypeScript SDK and AI agent

from pydantic import BaseModel
from typing import Optional, Literal


"""
Greeks associated with an option
"""

class OptionGreeks(BaseModel):
    delta: float
    iv: float
    gamma: float
    theta: float
    vega: float

"""
A single option order retrived from Thetanuts Optionbook

This is the normalized representation used by the application
"""

class OptionOrder(BaseModel):
    maker: str
    orderExpiryTimestamp: int
    expiry: int
    collateral: str
    isCall: bool
    priceFeed: str
    implementation: str
    isLong: bool
    maxCollateralUsable: str
    strikes: list[int]
    price: str
    numContracts: str
    extraOptionData: str
    signature: str
    nonce: str
    greeks: Optional[OptionGreeks] = None


"""
The Available options from Thetanuts Optionbook.
"""

class OptionBookData(BaseModel):
    chainId: int
    optionBookAddress: str
    orders: list[OptionOrder]
    lastUpdated: int
    currentTime: int


"""
Current underlying market condition
"""

class VolatilityData(BaseModel):
    current: float
    forecast: list[float]

class MarketState(BaseModel):
    price: dict[str, float]
    volatility: dict[str, VolatilityData]


"""
Combined market information given to the AI agent
"""

class TradingMarketData(BaseModel):
    market: MarketState
    optionBook: OptionBookData
    retrievedAt: int


"""
Request made by AI agent when it needs market data
"""

class MarketDataRequest(BaseModel):
    asset: str
    includeOptions: bool
    includeMarketState: bool
    optionType: Optional[Literal["call", "put", "both"]] = None
    side: Optional[Literal["long", "short", "both"]] = None
    expiryAfter: Optional[int] = None
    expiryBefore: Optional[int] = None
    strikeMin: Optional[int] = None
    strikeMax: Optional[int] = None
    limit: Optional[int] = None