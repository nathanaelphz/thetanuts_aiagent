import type { OptionOrder, MarketDataRequest } from "../schemas/schemas.js";

export function filterOptionBook(
  orders: OptionOrder[],
  filters: MarketDataRequest
): OptionOrder[] {
  let result = orders;

  // optionType: "call" | "put" | "both" -> isCall boolean
  if (filters.optionType === "call") {
    result = result.filter((o) => o.isCall === true);
  } else if (filters.optionType === "put") {
    result = result.filter((o) => o.isCall === false);
  }
  // "both" or undefined -> no filtering

  // side: "long" | "short" | "both" -> isLong boolean
  if (filters.side === "long") {
    result = result.filter((o) => o.isLong === true);
  } else if (filters.side === "short") {
    result = result.filter((o) => o.isLong === false);
  }

  if (filters.expiryAfter !== undefined) {
    const after = filters.expiryAfter;
    result = result.filter((o) => o.expiry >= after);
  }

  if (filters.expiryBefore !== undefined) {
    const before = filters.expiryBefore;
    result = result.filter((o) => o.expiry <= before);
  }

  // strikes is number[] per order (some products may have multiple legs/strikes)
  // "within range" = every strike on the order falls inside [min, max]
  if (filters.strikeMin !== undefined) {
    const min = filters.strikeMin;
    result = result.filter((o) => o.strikes.every((s) => s >= min));
  }

  if (filters.strikeMax !== undefined) {
    const max = filters.strikeMax;
    result = result.filter((o) => o.strikes.every((s) => s <= max));
  }

  if (filters.requireGreeks) {
    result = result.filter((o) => o.greeks !== undefined);
  }

  if (filters.limit !== undefined) {
    result = result.slice(0, filters.limit);
  }

  return result;
}