"""Fetch and normalize live option orders from the TypeScript server API."""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from datetime import datetime, timezone
from pprint import pprint

from src.server.client import MarketDataClient


def synthesize_ticker(order: dict, asset: str) -> str:
    """Build a stable ticker from the normalized order contract.

    This matches the historic AI format: SYMBOL-DDMMMYY-STRIKE-C/P.
    The strike scale is still an assumption and should be confirmed against a live
    sample once the upstream feed is inspected more closely.
    """
    expiry_ts = order.get("expiry")
    strikes = order.get("strikes") or []
    strike_raw = strikes[0] if strikes else 0
    strike_usd = strike_raw / 1e8 if strike_raw else 0

    expiry_date = datetime.fromtimestamp(expiry_ts, tz=timezone.utc).strftime("%d%b%y").upper()
    kind = "C" if order.get("isCall") else "P"
    return f"{asset.upper()}-{expiry_date}-{int(strike_usd)}-{kind}"


def _normalize_order(order: dict, asset: str) -> dict | None:
    """Convert a normalized server order to the legacy AI-engine format.
    
    Uses the SDK-calculated fill economics from demoFillPreview rather than
    reconstructing them from price × numContracts. This avoids unit/scale mismatches
    between CALL (which may use 18-decimal collateral) and PUT (6-decimal).
    """
    expiry = order.get("expiry")
    if expiry is None:
        return None

    greeks = order.get("greeks") or {}
    demo_fill = order.get("demoFillPreview") or {}
    
    # SDK-provided fill economics (totalCollateral is the fill premium in fixed-point)
    # Both are in USDC collateral decimals (6 decimals) as provided by previewFillOrder
    total_collateral_raw = demo_fill.get("totalCollateral")
    
    # Decode the SDK's fill premium: it's already calculated by previewFillOrder
    # and is in 6-decimal USDC format when fillSizeUsdc was provided (20_000000)
    premium_for_fill_usd = (
        float(total_collateral_raw) / 1_000_000
        if total_collateral_raw is not None
        else None
    )
    
    # Collateral allocated for this demo fill is also totalCollateral
    # (same value, but semantically the collateral budget used for the fill)
    collateral_for_fill_usd = (
        float(total_collateral_raw) / 1_000_000
        if total_collateral_raw is not None
        else None
    )
    
    raw_price = int(order.get("price", 0))

    return {
        "ticker": synthesize_ticker(order, asset),
        "underlying": asset,
        "is_call": bool(order.get("isCall")),
        "delta": greeks.get("delta") if isinstance(greeks, dict) else None,
        "premium_usd": raw_price / 1e8,
        "premium_for_fill_usd": premium_for_fill_usd,
        "max_collateral_usd": int(order.get("maxCollateralUsable", 0)) / 1_000_000,
        "collateral_for_fill_usd": collateral_for_fill_usd,
        "expiry_timestamp": int(expiry),
    }


async def _fetch_asset_orders(client: MarketDataClient, asset: str) -> list[dict]:
    """Fetch a single asset's option book and normalize it for downstream AI logic."""
    data = await client.fetch_market_data(
        asset=asset,
        include_options=True,
        include_market_state=True,
        require_greeks=True,
    )

    if not data.optionBook:
        return []

    normalized = []
    for order in data.optionBook.orders:
        order_dict = order.model_dump() if hasattr(order, "model_dump") else order
        converted = _normalize_order(order_dict, asset)
        if converted is not None:
            normalized.append(converted)
    return normalized


def fetch_orders() -> list[dict]:
    """Fetch BTC and ETH option books from the on-chain API and return AI-ready orders."""

    async def _fetch_all():
        client = MarketDataClient()
        try:
            merged = []
            for asset in ("BTC", "ETH"):
                merged.extend(await _fetch_asset_orders(client, asset))
            return merged
        finally:
            await client.close()

    return asyncio.run(_fetch_all())


def main():
    decoded = fetch_orders()
    print("Decoded orders (first 5):")
    pprint(decoded[:5])


if __name__ == "__main__":
    main()
