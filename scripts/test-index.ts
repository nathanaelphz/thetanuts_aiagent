import { fetchTradingMarketData } from "../src/onchain/index.js";

async function main() {
  console.log("=== INDEX TEST ===");

  const data = await fetchTradingMarketData();

  console.log("✓ Successfully imported through onchain/index.ts");
  console.log(`Chain ID: ${data.optionBook.chainId}`);
  console.log(`Live orders: ${data.optionBook.orders.length}`);
  console.log(`BTC: $${data.market.prices.BTC}`);
  console.log(`ETH: $${data.market.prices.ETH}`);
}

main().catch((err) => {
  console.error("Index test failed:", err);
  process.exit(1);
});