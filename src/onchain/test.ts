import { checkConnection } from "./client.js";
import { fetchLiveOrders, getMarketPrices, previewFill } from "./orders.js";

async function main() {
  console.log("=== Step 1: Checking wallet connection ===");
  await checkConnection();

  console.log("\n=== Step 2: Fetching live market prices ===");
  await getMarketPrices();

  console.log("\n=== Step 3: Fetching live orders ===");
  const orders = await fetchLiveOrders();

  if (orders.length > 0) {
    console.log("\n=== Step 4: Previewing a fill (no money spent) ===");
    previewFill(orders[0], 10_000000n); // preview a $10 fill
  } else {
    console.log("No live orders available to preview right now.");
  }
}

main().catch((err) => console.error("Test failed:", err));