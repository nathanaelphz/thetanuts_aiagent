"""
Smoke test for MarketDataClient against a running server.ts instance.

Usage:
    python -m src.server.test_client
    python -m src.server.test_client --dump   (also writes sample JSON files)
"""

import asyncio
import json
import sys

from .client import (
    MarketDataClient,
    MarketDataUnavailableError,
    MarketDataInvalidResponseError,
)


def dump_to_file(data, filename: str):
    """Write a Pydantic model to a JSON file for inspection / handoff."""
    with open(filename, "w") as f:
        # model_dump_json handles nested models cleanly, indent for readability
        f.write(data.model_dump_json(indent=2))
    print(f"   💾 Saved to {filename}")


async def main():
    dump_mode = "--dump" in sys.argv

    client = MarketDataClient()

    print(f"Testing against: {client.base_url}")
    print("-" * 50)

    print("1. Checking /status...")
    is_up = await client.check_status()
    if not is_up:
        print("   ❌ server.ts is not responding at /status")
        await client.close()
        sys.exit(1)
    print("   ✅ server.ts is up")

    test_asset = "cbBTC"

    # --- Unfiltered baseline ---
    print(f"\n2. Fetching unfiltered market data for asset='{test_asset}'...")
    try:
        data = await client.fetch_market_data(
            asset=test_asset,
            include_options=True,
            include_market_state=True,
        )
        total_orders = len(data.optionBook.orders) if data.optionBook else 0
        print(f"   ✅ Received {total_orders} orders (unfiltered)")
        if dump_mode:
            dump_to_file(data, "sample_market_data_unfiltered.json")
    except (MarketDataUnavailableError, MarketDataInvalidResponseError) as e:
        print(f"   ❌ {e}")
        await client.close()
        sys.exit(1)

    # --- Filtered: calls only, require greeks, limit 5 ---
    print(f"\n3. Fetching filtered: option_type='call', require_greeks=True, limit=5...")
    try:
        filtered = await client.fetch_market_data(
            asset=test_asset,
            include_options=True,
            include_market_state=True,
            option_type="call",
            require_greeks=True,
            limit=5,
        )
        filtered_orders = filtered.optionBook.orders if filtered.optionBook else []
        print(f"   ✅ Received {len(filtered_orders)} orders (should be ≤ 5)")

        for o in filtered_orders:
            assert o.isCall is True, f"Expected isCall=True, got {o.isCall}"
            assert o.greeks is not None, "Expected greeks to be present, got None"
        print("   ✅ All returned orders are calls with non-null greeks")

        if dump_mode:
            dump_to_file(filtered, "sample_market_data_filtered_calls.json")

    except (MarketDataUnavailableError, MarketDataInvalidResponseError) as e:
        print(f"   ❌ {e}")
        await client.close()
        sys.exit(1)
    except AssertionError as e:
        print(f"   ❌ Filter correctness check failed: {e}")
        await client.close()
        sys.exit(1)

    # --- Filtered: puts, short side ---
    print(f"\n4. Fetching filtered: option_type='put', side='short'...")
    try:
        puts_short = await client.fetch_market_data(
            asset=test_asset,
            include_options=True,
            include_market_state=True,
            option_type="put",
            side="short",
        )
        puts_orders = puts_short.optionBook.orders if puts_short.optionBook else []
        print(f"   ✅ Received {len(puts_orders)} orders")

        for o in puts_orders:
            assert o.isCall is False, f"Expected isCall=False, got {o.isCall}"
            assert o.isLong is False, f"Expected isLong=False (short), got {o.isLong}"
        print("   ✅ All returned orders are short puts")

        if dump_mode:
            dump_to_file(puts_short, "sample_market_data_short_puts.json")

    except (MarketDataUnavailableError, MarketDataInvalidResponseError) as e:
        print(f"   ❌ {e}")
        await client.close()
        sys.exit(1)
    except AssertionError as e:
        print(f"   ❌ Filter correctness check failed: {e}")
        await client.close()
        sys.exit(1)

    finally:
        await client.close()

    print("\n" + "-" * 50)
    print("All filter smoke tests passed.")
    if dump_mode:
        print("Sample JSON files written to current directory.")


if __name__ == "__main__":
    asyncio.run(main())