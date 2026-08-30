import fetch from "node-fetch";

const URL = "https://round-snowflake-9c31.devops-118.workers.dev/";

async function main() {
  console.log("Fetching raw Thetanuts market data...");

  const response = await fetch(URL);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const rawPayload = await response.json();

  console.log("\n=== TOP-LEVEL RESPONSE KEYS ===");
  console.log(Object.keys(rawPayload));

  // Extract raw sections
  const marketData = rawPayload.market_data ?? rawPayload.data?.market_data;
  const marketWeather = rawPayload.market_weather ?? rawPayload.data?.market_weather;

  console.log("\n=== RAW MARKET DATA ===");
  console.dir(marketData, { depth: null });

  console.log("\n=== RAW MARKET WEATHER (VOLATILITY) ===");
  console.dir(marketWeather, { depth: null });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});