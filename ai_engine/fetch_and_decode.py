"""Temporary exploration script for decoding live options payloads.

This is throwaway code used to sanity-check the raw order data before the
official normalized format from Person 2 is available.
"""

import json
from pprint import pprint

import requests


URL = "https://round-snowflake-9c31.devops-118.workers.dev/"


def parse_ticker(ticker: str) -> str:
    """Extract the underlying symbol from a ticker like BTC-31AUG26-77500-P."""
    if not ticker:
        return ""
    return ticker.split("-")[0]


def decode_orders(raw_orders):
    """Convert raw integer-scaled fields into human-readable USD values."""
    normalized = []

    for order in raw_orders:
        raw_order = order.get("order", {})

        ticker = raw_order.get("ticker", "")
        underlying = parse_ticker(ticker)
        is_call = bool(raw_order.get("isCall"))
        expiry = raw_order.get("expiry")

        # ASSUMPTION: verify these decimal counts with the team — not yet confirmed
        strikes = [s / 10**8 for s in raw_order.get("strikes", [])]
        premium = int(raw_order.get("price", 0)) / 10**6
        max_collateral = int(raw_order.get("maxCollateralUsable", 0)) / 10**6

        greeks = raw_order.get("greeks", {})

        normalized.append(
            {
                "ticker": ticker,
                "underlying": underlying,
                "is_call": is_call,
                "strike_usd": strikes,
                "expiry_timestamp": expiry,
                "premium_usd": premium,
                "max_collateral_usd": max_collateral,
                "greeks": greeks,
            }
        )

    return normalized


def main():
    response = requests.get(URL, timeout=30)
    response.raise_for_status()
    payload = response.json()

    data = payload.get("data", {})
    raw_orders = data.get("orders", [])

    decoded = decode_orders(raw_orders)

    print("Decoded orders (first 5):")
    pprint(decoded[:5])


if __name__ == "__main__":
    main()
