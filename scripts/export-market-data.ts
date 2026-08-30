import { fetchTradingMarketData } from "../src/onchain/index.js";
import { writeFile } from "node:fs/promises";

const data = await fetchTradingMarketData();

await writeFile(
  "./market-data.json",
  JSON.stringify(data, null, 2)
);

console.log("Market data exported.");