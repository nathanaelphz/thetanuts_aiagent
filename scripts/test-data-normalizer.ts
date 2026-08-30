import { fetchTradingMarketData } from "../src/onchain/orders.js";

async function main() {
  const data = await fetchTradingMarketData();

  console.log("=== TRADING MARKET DATA ===");
  console.log("Retrieved at:", new Date(data.retrievedAt).toISOString());
  console.log("Chain ID:", data.optionBook.chainId);
  console.log("Live orders:", data.optionBook.orders.length);
  console.log("\nPrices:", data.market.prices);
  console.log("\nVolatility:", data.market.volatility);
}

main().catch((err) => {
  console.error("Trading market data test failed:", err);
});