import { client } from "./client.js";
import { log } from "./logger.js";

export async function getMarketPrices() {
  log("MARKET_PRICES", "Fetching live market prices...");
  const marketData = await client.api.getMarketData();
  log("MARKET_PRICES", "Prices retrieved", {
    BTC: marketData.prices.BTC,
    ETH: marketData.prices.ETH,
  });
  return marketData;
}

export function previewFill(order: any, usdcAmount: bigint) {
  const preview = client.optionBook.previewFillOrder(order, usdcAmount);
  log("PREVIEW_FILL", "Fill preview calculated", {
    numContracts: preview.numContracts,
    totalCollateral: preview.totalCollateral,
  });
  return preview;
}

export async function fetchLiveOrders() {
  log("FETCH_ORDERS", "Fetching live orders from Thetanuts...");
  const orders = await client.api.fetchOrders();
  const now = Math.floor(Date.now() / 1000);
  const validOrders = orders.filter((o: any) => Number(o.order.expiry) > now + 60);

  const DEMO_FILL_SIZE = 20_000000n; // $20 USDC

  const enrichedOrders = validOrders.map((order: any) => {
    const preview = client.optionBook.previewFillOrder(order, DEMO_FILL_SIZE);
    return {
      ...order,
      demoFillPreview: {
        fillSizeUsdc: DEMO_FILL_SIZE.toString(),
        numContracts: preview.numContracts.toString(),
        totalCollateral: preview.totalCollateral.toString(),
      },
    };
  });

  log("FETCH_ORDERS", `Found ${enrichedOrders.length} valid orders (enriched with $20 fill preview)`);
  return enrichedOrders;
}