import { client } from "./client";

// Fetch live option orders from Thetanuts, filtering out expired ones
export async function fetchLiveOrders() {
  const orders = await client.api.fetchOrders();
  const now = Math.floor(Date.now() / 1000);
  const validOrders = orders.filter((o: any) => Number(o.order.expiry) > now + 60); // 60s safety buffer
  console.log(`Found ${validOrders.length} valid orders (of ${orders.length} total)`);
  return validOrders;
}

// Get live BTC/ETH prices
export async function getMarketPrices() {
  const marketData = await client.api.getMarketData();
  console.log(`BTC: $${marketData.prices.BTC}`);
  console.log(`ETH: $${marketData.prices.ETH}`);
  return marketData;
}

// Preview what filling an order would cost, WITHOUT executing it
export function previewFill(order: any, usdcAmount: bigint) {
  const preview = client.optionBook.previewFillOrder(order, usdcAmount);
  console.log(`Contracts: ${preview.numContracts}, Collateral: ${preview.totalCollateral}`);
  return preview;
}