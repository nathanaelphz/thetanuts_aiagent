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

// Fetch live option orders from Thetanuts, filtering out expired ones
export async function fetchLiveOrders(): Promise<OptionOrder[]> {
  const orders = await client.api.fetchOrders();
  const now = Math.floor(Date.now() / 1000);
  const validOrders = orders.filter((o: any) => Number(o.order.expiry) > now + 60); // 60s safety buffer
  console.log(`Found ${validOrders.length} valid orders (of ${orders.length} total)`);
  return validOrders.map(normalizeOptionOrder);
}

// Get live BTC/ETH prices
export async function getMarketPrices() {
  const marketData = await client.api.getMarketData();
  console.log(`BTC: $${marketData.prices.BTC}`);
  console.log(`ETH: $${marketData.prices.ETH}`);
  return marketData;
}

// Build the complete OptionBookData contract
export async function fetchOptionBookData(): Promise<OptionBookData> {
  const rawOrders = await client.api.fetchOrders();
  const now = Math.floor(Date.now() / 1000);
  const liveOrders = rawOrders.filter(
    (o: any) => Number(o.order.expiry) > now + 60);
  console.log(`Found ${liveOrders.length} valid orders (of ${rawOrders.length} total)`);
  const optionBookAddress = client.chainConfig.contracts.optionBook;
  if (!optionBookAddress) {
    throw new Error("Thetanuts OptionBook address is not configured");
  }

  return normalizeOptionBookData(
    liveOrders,
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

  if (!response.ok) {
    throw new Error(`Market weather fetch failed: HTTP ${response.status}: ${response.statusText}`);
  }

  const rawPayload: any = await response.json();

  const marketWeather = rawPayload.market_weather ?? rawPayload.data?.market_weather;

  if (!marketWeather) {
    throw new Error("Market weather response missing market_weather field");
  }

  return marketWeather;
}

// Fetch and normalize the complete TradingMarketData contract
export async function fetchTradingMarketData(): Promise<TradingMarketData> {
  const [optionBook, priceData, weatherData] = await Promise.all([
    fetchOptionBookData(),
    getMarketPrices(),
    getMarketWeather(),
  ]);

  const market = normalizeMarketState(priceData.prices, weatherData);

  return normalizeTradingMarketData(market, optionBook);
}