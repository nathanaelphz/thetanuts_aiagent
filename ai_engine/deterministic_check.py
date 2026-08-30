from datetime import datetime, timezone

YIELD_MIN_PCT = 3.0
DELTA_MAX_ABS = 0.30
EXPIRY_MIN_DAYS = 3
EXPIRY_MAX_DAYS = 10
ALLOWED_UNDERLYINGS = {"BTC", "ETH"}


def deterministic_filter(orders: list[dict]) -> list[dict]:
    """
    Independent, rule-based cross-check — no LLM involved.
    Computes qualifying trades with plain arithmetic, as ground truth
    to compare against the AI's shortlist.
    """
    now = datetime.now(timezone.utc).timestamp()
    qualifying = []

    for o in orders:
        if o.get("underlying") not in ALLOWED_UNDERLYINGS:
            continue

        delta = o.get("delta")
        if delta is None or abs(delta) > DELTA_MAX_ABS:
            continue

        expiry_days = (o["expiry_timestamp"] - now) / 86400
        if not (EXPIRY_MIN_DAYS <= expiry_days <= EXPIRY_MAX_DAYS):
            continue

        collateral = o.get("max_collateral_usd", 0)
        if collateral <= 0:
            continue
        yield_pct = (o["premium_usd"] / collateral) * 100
        if yield_pct < YIELD_MIN_PCT:
            continue

        qualifying.append({
            "ticker": o["ticker"],
            "yield_pct": round(yield_pct, 3),
            "delta": delta,
            "expiry_days": round(expiry_days, 2),
        })

    return sorted(qualifying, key=lambda x: x["yield_pct"], reverse=True)


def cross_check(ai_candidates: list, deterministic_result: list) -> dict:
    """Compares AI shortlist against deterministic ground truth."""
    ai_tickers = {c.ticker for c in ai_candidates}
    det_tickers = {d["ticker"] for d in deterministic_result}

    return {
        "agree": ai_tickers == det_tickers,
        "ai_included_but_shouldnt_have": ai_tickers - det_tickers,
        "ai_missed_valid_trades": det_tickers - ai_tickers,
    }
