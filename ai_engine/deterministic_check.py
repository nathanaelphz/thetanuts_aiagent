from compute import compute_derived_fields, passes_rules

YIELD_MIN_PCT = 3.0
DELTA_MAX_ABS = 0.30
EXPIRY_MIN_DAYS = 3
EXPIRY_MAX_DAYS = 10
ALLOWED_UNDERLYINGS = {"BTC", "ETH"}


def deterministic_filter(orders: list[dict]) -> list[dict]:
    """
    Independent, rule-based cross-check — no LLM involved.
    Uses the shared compute.py logic as the single source of truth for
    yield and expiry math so the AI and deterministic filter can never drift.
    """
    qualifying = []

    for o in orders:
        derived = compute_derived_fields(o)
        ok, _ = passes_rules(o, derived)
        if not ok:
            continue

        qualifying.append({
            "ticker": o["ticker"],
            "yield_pct": derived["yield_pct"],
            "delta": o.get("delta"),
            "expiry_days": derived["expiry_days"],
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
