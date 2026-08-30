import { fetchTradingMarketData } from "../src/onchain/index.js";

async function main() {
  console.log("=== AGENT DATA TEST ===");

  const data = await fetchTradingMarketData();

  console.log("\n=== TRADING MARKET DATA ===");
  console.log(JSON.stringify(data, null, 2));

  console.log("\n=== SUMMARY ===");
  console.log(`Chain ID: ${data.optionBook.chainId}`);
  console.log(`Live orders: ${data.optionBook.orders.length}`);
  console.log(`BTC: $${data.market.prices.BTC}`);
  console.log(`ETH: $${data.market.prices.ETH}`);
  console.log(`BTC IV: ${data.market.volatility.BTC?.current}`);
  console.log(`ETH IV: ${data.market.volatility.ETH?.current}`);
  console.log(`Retrieved: ${new Date(data.retrievedAt).toISOString()}`);
}

main().catch((err) => {
  console.error("Agent data test failed:", err);
  process.exit(1);
});