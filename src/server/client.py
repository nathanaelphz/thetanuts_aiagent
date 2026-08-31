"""
Async HTTP client for the TypeScript on-chain data service (server.ts).

Owns transport concerns only: base URL, timeouts, retries, and
serialization/deserialization against the shared schema contract.
decision_engine.py should depend on this via a plain method call and
never construct requests directly.
"""

import os
from typing import Optional, Literal

import httpx
from pydantic import ValidationError

from ..schemas.schemas import TradingMarketData  # adjust if schemas.py lives elsewhere


class MarketDataClientError(Exception):
    """Base exception for market data client failures."""


class MarketDataUnavailableError(MarketDataClientError):
    """Raised when server.ts is unreachable or times out."""


class MarketDataInvalidResponseError(MarketDataClientError):
    """Raised when server.ts returns a response that doesn't match the schema."""


class MarketDataClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout_seconds: float = 10.0,
    ):
        self.base_url = base_url or os.environ.get(
            "ONCHAIN_SERVICE_URL", "http://localhost:3000"
        )
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout_seconds,
        )

    async def fetch_market_data(
        self,
        asset: str,
        include_options: bool = True,
        include_market_state: bool = True,
        option_type: Optional[Literal["call", "put", "both"]] = None,
        side: Optional[Literal["long", "short", "both"]] = None,
        expiry_after: Optional[int] = None,
        expiry_before: Optional[int] = None,
        strike_min: Optional[int] = None,
        strike_max: Optional[int] = None,
        require_greeks: Optional[bool] = None,
        limit: Optional[int] = None,
    ) -> TradingMarketData:
        payload = {
            "asset": asset,
            "includeOptions": include_options,
            "includeMarketState": include_market_state,
        }

        optional_fields = {
            "optionType": option_type,
            "side": side,
            "expiryAfter": expiry_after,
            "expiryBefore": expiry_before,
            "strikeMin": strike_min,
            "strikeMax": strike_max,
            "requireGreeks": require_greeks,
            "limit": limit,
        }
        payload.update({k: v for k, v in optional_fields.items() if v is not None})

        try:
            response = await self._client.post("/market-data", json=payload)
        except httpx.TimeoutException as e:
            raise MarketDataUnavailableError(
                f"Timed out waiting for on-chain service at {self.base_url}"
            ) from e
        except httpx.ConnectError as e:
            raise MarketDataUnavailableError(
                f"Could not connect to on-chain service at {self.base_url}"
            ) from e

        if response.status_code != 200:
            raise MarketDataUnavailableError(
                f"On-chain service returned {response.status_code}: {response.text}"
            )

        try:
            data = response.json()
            return TradingMarketData.model_validate(data)
        except ValidationError as e:
            raise MarketDataInvalidResponseError(
                f"Response from on-chain service did not match TradingMarketData schema: {e}"
            ) from e    

    async def check_status(self) -> bool:
        """Lightweight health check against /status."""
        try:
            response = await self._client.get("/status")
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def close(self):
        await self._client.aclose()