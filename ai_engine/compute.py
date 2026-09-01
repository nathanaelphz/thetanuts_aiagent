from datetime import datetime, timezone


def compute_derived_fields(order: dict) -> dict:
    """
    Computes cost_per_delta and expiry_days from a sanitized order dict.
    This is the ONLY place these numbers get calculated — never trust
    an LLM's self-reported version of these values.
    """
    now = datetime.now(timezone.utc).timestamp()
    expiry_days = (order["expiry_timestamp"] - now) / 86400

    premium_for_fill = order.get("premium_for_fill_usd")
    delta = order.get("delta")
    cost_per_delta = None

    if premium_for_fill is not None and delta is not None and delta != 0:
        cost_per_delta = premium_for_fill / abs(delta)

    return {
        "cost_per_delta": round(cost_per_delta, 3) if cost_per_delta is not None else None,
        "expiry_days": round(expiry_days, 2),
    }


def passes_rules(order: dict, derived: dict) -> tuple[bool, str]:
    """Returns (True, '') if the order genuinely passes all rules when
    correctly recomputed, or (False, reason) if not."""
    if order.get("underlying") not in {"BTC", "ETH"}:
        return False, f"underlying {order.get('underlying')} not BTC/ETH"

    delta = order.get("delta")
    if delta is None or not (0.15 <= abs(delta) <= 0.40):
        return False, f"delta {delta} outside 0.15-0.40 range"

    if not (3 <= derived["expiry_days"] <= 10):
        return False, f"expiry_days {derived['expiry_days']} outside 3-10 window"

    if derived["cost_per_delta"] is None:
        return False, "cost_per_delta is None"

    return True, ""
