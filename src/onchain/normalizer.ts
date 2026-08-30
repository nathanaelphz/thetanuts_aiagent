import type {
    OptionBookData,
    OptionOrder,
    OptionGreeks,
    MarketState,
    VolatilityData,
    TradingMarketData
} from "../schemas/schemas.js";

// normalize a raw order from Thetanuts API 

export function normalizeOptionOrder(raw: any): OptionOrder {
  const order = raw.order;
  const api = raw.rawApiData;

  if (!api) {
    throw new Error("normalizeOptionOrder: missing rawApiData on order entry");
  }

  const greeks: OptionGreeks | undefined = api.greeks
    ? {
        delta: Number(api.greeks.delta),
        iv: Number(api.greeks.iv),
        gamma: Number(api.greeks.gamma),
        theta: Number(api.greeks.theta),
        vega: Number(api.greeks.vega),
      }
    : undefined;

    return {
    maker: order.maker,
    orderExpiryTimestamp: Number(api.orderExpiryTimestamp),
    expiry: Number(order.expiry),
    collateral: api.collateral,
    isCall: Boolean(api.isCall),
    priceFeed: api.priceFeed,
    implementation: api.implementation,
    isLong: Boolean(api.isLong),
    maxCollateralUsable: String(api.maxCollateralUsable),
    strikes: api.strikes.map((s: any) => Number(s)),
    price: String(order.price),
    numContracts: String(order.numContracts ?? "0"),
    extraOptionData: api.extraOptionData,
    signature: raw.signature,
    nonce: String(order.nonce),   // BigInt — must stay a string, exceeds Number.MAX_SAFE_INTEGER
    greeks,
  };
}

// normalize a set of raw orders on optionbook into OptionBookData

export function normalizeOptionBookData(
  rawOrders: any[],
  chainId: number,
  optionBookAddress: string,
): OptionBookData {

  const orders = rawOrders.map(normalizeOptionOrder);

  const now = Date.now();

  return {
    chainId,
    optionBookAddress,
    orders,
    lastUpdated: now,
    currentTime: now,
  };
}

export function normalizeMarketState(
  rawPrices: Record<string, number>,
  rawWeather: Record<string, any>,
): MarketState {
  const volatility: Record<string, VolatilityData> = {};

  for (const [symbol, data] of Object.entries(rawWeather ?? {})) {
    volatility[symbol] = {
      current: Number(data.curVol),
      forecast: Array.isArray(data.forecast) ? data.forecast.map(Number) : [],
    };
  }

  return {
    prices: rawPrices,
    volatility,
  };
}

export function normalizeTradingMarketData(
  market: MarketState,
  optionBook: OptionBookData,
): TradingMarketData {
  return {
    market,
    optionBook,
    retrievedAt: Date.now(),
  };
}