import { client } from "./client.js";
import {
  normalizeOptionOrder,
  normalizeOptionBookData,
  normalizeMarketState,
  normalizeTradingMarketData,
} from "./normalizer.js";

import type {
  OptionBookData,
  OptionOrder,
  TradingMarketData
} from "../schemas/schemas.js";

// Legacy compatibility helper retained for now.
// The server path is using fetchOptionBookData(asset), which is the canonical
// enriched path that attaches preview fill metadata before normalization.
export async function fetchLiveOrders(): Promise<OptionOrder[]> {
  const optionBook = await fetchOptionBookData();
  return optionBook.orders;
}

// Get live BTC/ETH prices
export async function getMarketPrices() {
  const marketData = await client.api.getMarketData();
  console.log(`BTC: $${marketData.prices.BTC}`);
  console.log(`ETH: $${marketData.prices.ETH}`);
  return marketData;
}

// Build the complete OptionBookData contract.
// This is the canonical server-side path and must include preview fill data.
export async function fetchOptionBookData(asset?: string): Promise<OptionBookData> {
  let rawOrders: any[] = [];

  try {
    rawOrders = asset
      ? await client.api.filterOrders({ asset })
      : await client.api.fetchOrders();
  } catch (error) {
    console.warn(
      `client.api.filterOrders({ asset: ${asset ?? "undefined"} }) failed; falling back to raw fetch + local asset filtering.`,
      error,
    );
    rawOrders = await client.api.fetchOrders();
  }

  if (asset) {
    const targetAsset = asset.toUpperCase();
    const targetPriceFeed = client.chainConfig?.priceFeeds?.[targetAsset]?.toLowerCase();
    rawOrders = rawOrders.filter((order: any) => {
      const priceFeed = String(
        order?.rawApiData?.priceFeed ?? order?.order?.priceFeed ?? ""
      ).toLowerCase();
      return targetPriceFeed ? priceFeed === targetPriceFeed : true;
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const liveOrders = rawOrders.filter((o: any) => Number(o.order.expiry) > now + 60);
  console.log(`Found ${liveOrders.length} valid orders (of ${rawOrders.length} total)`);

  const enrichedOrders = liveOrders.map((order: any) => {
    const preview = client.optionBook.previewFillOrder(order, 20_000000n);
    return {
      ...order,
      demoFillPreview: {
        fillSizeUsdc: "20000000",
        numContracts: String(preview.numContracts ?? "0"),
        totalCollateral: String(preview.totalCollateral ?? "0"),
      },
    };
  });

  const optionBookAddress = client.chainConfig.contracts.optionBook;
  if (!optionBookAddress) {throw new Error("Thetanuts OptionBook address is not configured");}

  return normalizeOptionBookData(
    enrichedOrders,
    client.chainConfig.chainId,
    optionBookAddress
    );
}


// Preview what filling an order would cost, WITHOUT executing it
export function previewFill(order: any, usdcAmount: bigint) {
  const preview = client.optionBook.previewFillOrder(order, usdcAmount);
  console.log(`Contracts: ${preview.numContracts}, Collateral: ${preview.totalCollateral}`);
  return preview;
}

// Fetch market weather 

const MARKET_WEATHER_URL = "https://round-snowflake-9c31.devops-118.workers.dev/";

export async function getMarketWeather(): Promise<Record<string, { curVol: number; forecast: number[] }>> {
  const response = await fetch(MARKET_WEATHER_URL);
  if (!response.ok) {throw new Error(`Market weather fetch failed: HTTP ${response.status}: ${response.statusText}`);}
  const rawPayload: any = await response.json();
  const marketWeather = rawPayload.market_weather ?? rawPayload.data?.market_weather;
  if (!marketWeather) {throw new Error("Market weather response missing market_weather field");}
  return marketWeather;
}

// Fetch and normalize the complete TradingMarketData contract
export async function fetchTradingMarketData(params: {
  asset?: string;
  includeOptions?: boolean;
  includeMarketState?: boolean;
} = {}): Promise<TradingMarketData> {
  const {
    asset,
    includeOptions = true,
    includeMarketState = true,
  } = params;

  const [optionBook, priceData, weatherData] = await Promise.all([
    includeOptions ? fetchOptionBookData(asset) : Promise.resolve(undefined),
    includeMarketState ? getMarketPrices() : Promise.resolve(undefined),
    includeMarketState ? getMarketWeather() : Promise.resolve(undefined),
  ]);

  const market = includeMarketState && priceData && weatherData
    ? normalizeMarketState(priceData.prices, weatherData)
    : undefined;

  return normalizeTradingMarketData(market, optionBook);
}