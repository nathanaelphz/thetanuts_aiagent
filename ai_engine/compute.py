from datetime import datetime, timezone


def compute_derived_fields(order: dict) -> dict:
    """
    Computes yield_pct and expiry_days from a sanitized order dict.
    This is the ONLY place these numbers get calculated — never trust
    an LLM's self-reported version of these values.
    """
    now = datetime.now(timezone.utc).timestamp()
    expiry_days = (order["expiry_timestamp"] - now) / 86400
    collateral = order.get("max_collateral_usd", 0)
    yield_pct = (order["premium_usd"] / collateral * 100) if collateral > 0 else 0.0
    return {
        "yield_pct": round(yield_pct, 3),
        "expiry_days": round(expiry_days, 2),
    }


def passes_rules(order: dict, derived: dict) -> tuple[bool, str]:
    """Returns (True, '') if the order genuinely passes all rules when
    correctly recomputed, or (False, reason) if not."""
    if order.get("underlying") not in {"BTC", "ETH"}:
        return False, f"underlying {order.get('underlying')} not BTC/ETH"
    delta = order.get("delta")
    if delta is None or abs(delta) > 0.30:
        return False, f"delta {delta} exceeds 0.30 cap"
    if not (3 <= derived["expiry_days"] <= 10):
        return False, f"expiry_days {derived['expiry_days']} outside 3-10 window"
    if derived["yield_pct"] < 3.0:
        return False, f"yield_pct {derived['yield_pct']} below 3% minimum"
    return True, ""
