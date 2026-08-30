import { checkConnection } from "./client.js";
import { getMarketPrices } from "./orders.js";

async function main() {
  console.log("=== Thetanuts Connection Test ===");

  console.log("\n=== Step 1: Checking client connection ===");
  await checkConnection();
  console.log("✓ Client connection successful");

  console.log("\n=== Step 2: Testing market data API ===");
  const marketData = await getMarketPrices();

  console.log("✓ Market data API successful");
  console.log("Available assets:", Object.keys(marketData.prices));

  console.log("\n=== Connection Test Passed ===");
}

main().catch((err) => {
  console.error("\n✗ Connection test failed:");
  console.error(err);
  process.exit(1);
});

