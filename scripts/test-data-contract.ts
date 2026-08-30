import { fetchTradingMarketData } from "../src/onchain/orders.js";

async function main() {
  console.log("=== DATA CONTRACT TEST ===");

  const data = await fetchTradingMarketData();

  console.log("\n=== OPTION BOOK DATA ===");
  console.log("Chain ID:", data.optionBook.chainId);
  console.log("OptionBook:", data.optionBook.optionBookAddress);
  console.log("Live orders:", data.optionBook.orders.length);

  console.log("\n=== FIRST NORMALIZED ORDER ===");
  console.dir(data.optionBook.orders[6], { depth: null });

  console.log("\n=== MARKET DATA ===");
  console.log("Prices:", data.market.prices);
  console.log("Volatility:", data.market.volatility);

  console.log("\n=== TRADING MARKET DATA ===");
  console.log("Retrieved at:", new Date(data.retrievedAt).toISOString());
}

main().catch((err) => {
  console.error("Data contract test failed:", err);
});