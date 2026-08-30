import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from openai import OpenAI
from pydantic import ValidationError

from compute import compute_derived_fields, passes_rules
from deterministic_check import cross_check, deterministic_filter
from fetch_and_decode import fetch_orders
from prompt import SYSTEM_PROMPT
from sanitize import sanitize_orders
from schema import AIShortlist, RankedCandidates, TradeCandidate

logging.basicConfig(level=logging.WARNING)


def parse_candidates_safely(raw_candidates: list[dict], orders: list[dict]) -> RankedCandidates:
    """
    Rebuilds the shortlist from real order data rather than trusting the AI's
    self-reported values. The AI is only allowed to propose tickers and
    reasoning; Python independently recomputes the numbers and validates them.
    """
    order_lookup = {order["ticker"]: order for order in orders}
    verified = []

    for i, item in enumerate(raw_candidates):
        ticker = item.ticker
        reasoning = item.reasoning

        if not ticker:
            print(f"⚠️ AI candidate #{i} missing ticker — dropped")
            continue

        order = order_lookup.get(ticker)
        if order is None:
            print(f"⚠️ AI proposed ticker '{ticker}' not found in real order data — dropped (possible hallucination)")
            continue

        derived = compute_derived_fields(order)
        ok, reason = passes_rules(order, derived)
        if not ok:
            print(f"⚠️ AI proposed ticker '{ticker}' failed verification: {reason} — dropped")
            continue

        verified.append(
            TradeCandidate(
                ticker=ticker,
                yield_pct=derived["yield_pct"],
                delta=float(order["delta"]),
                expiry_days=derived["expiry_days"],
                max_collateral_usd=float(order.get("max_collateral_usd", 0.0)),
                reasoning=reasoning,
            )
        )

    ranked = RankedCandidates(candidates=sorted(verified, key=lambda c: c.yield_pct, reverse=True))
    return ranked


# This helper centralizes the model invocation and keeps the top-level script simple.
def get_ranked_candidates(orders: list) -> Optional[RankedCandidates]:
    """Send the orders to Gonka Router and validate the ranked shortlist JSON."""
    api_key = os.getenv("GONKA_API_KEY")
    base_url = os.getenv("GONKA_BASE_URL")
    model = os.getenv("GONKA_MODEL")

    if not api_key or not base_url or not model:
        print("Missing Gonka config: set GONKA_API_KEY, GONKA_BASE_URL, and GONKA_MODEL.")
        return None

    client = OpenAI(api_key=api_key, base_url=base_url)

    try:
        # Debug the exact payload before the API call so we can catch silent data-loss issues.
        print("=== SENDING TO LLM ===")
        print(json.dumps(orders, indent=2)[:2000])

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(orders, ensure_ascii=False)},
        ]

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=4096,
        )

        raw_text = response.choices[0].message.content
        if raw_text is None:
            raise ValueError("LLM returned an empty message content")

        parsed = json.loads(raw_text)
        shortlist = AIShortlist.model_validate(parsed)
        ranked = parse_candidates_safely(shortlist.candidates, orders)

        print("Validated ranked candidates:")
        print(ranked.model_dump_json(indent=2))
        return ranked

    except json.JSONDecodeError as exc:
        print(f"JSON parsing failed: {exc}")
        print(f"Raw response: {raw_text if 'raw_text' in locals() else 'N/A'}")
        return None
    except Exception as exc:
        print(f"Ranked-candidate validation or API call failed: {type(exc).__name__}: {exc}")
        return None


def present_and_select(ranked: RankedCandidates):
    """Display qualifying trades, let a human choose one, and ask for a size."""
    if not ranked.candidates:
        print("No qualifying trades right now.")
        return None

    print("\n=== QUALIFYING TRADES (ranked by yield) ===")
    for i, c in enumerate(ranked.candidates):
        print(
            f"[{i}] {c.ticker} | yield {c.yield_pct:.2f}% | delta {c.delta:.3f} | "
            f"expires in {c.expiry_days:.1f}d | max capacity ${c.max_collateral_usd:,.0f}"
        )
        print(f"    reasoning: {c.reasoning}")

    choice = input("\nEnter number to select (or 'skip'): ").strip()
    if choice.lower() == "skip":
        return None

    selected = ranked.candidates[int(choice)]
    size = float(input(f"How much collateral (USD) to use on {selected.ticker}? "))

    # This is where Person 4's safety check should run next, before execution.
    return {"candidate": selected, "size_usd": size}


if __name__ == "__main__":
    orders = fetch_orders()
    if not orders:
        print("No orders were returned by the fetcher.")
    else:
        orders = sanitize_orders(orders)
        print(f"{len(orders)} orders passed sanitization")

        ranked = get_ranked_candidates(orders)
        if ranked is not None:
            det_result = deterministic_filter(orders)
            comparison = cross_check(ranked.candidates, det_result)

            print("\n=== CROSS-CHECK: AI vs DETERMINISTIC RULE ===")
            if comparison["agree"]:
                print("✅ AI and deterministic rule AGREE on qualifying trades.")
            else:
                print("⚠️  DISAGREEMENT — investigate before trusting this shortlist:")
                if comparison["ai_included_but_shouldnt_have"]:
                    print(f"  AI wrongly included (not in deterministic result): {comparison['ai_included_but_shouldnt_have']}")
                if comparison["ai_missed_valid_trades"]:
                    print(f"  AI wrongly excluded (deterministic found these, AI missed them): {comparison['ai_missed_valid_trades']}")
            print(f"Deterministic ground truth found {len(det_result)} qualifying trades: {[d['ticker'] for d in det_result]}")

            print("Final shortlist:")
            print(ranked)
            present_and_select(ranked)
