import express from "express";
import { fetchTradingMarketData } from "../onchain/index.js";
import { filterOptionBook } from "../onchain/filters.js";
import type { MarketDataRequest } from "../schemas/schemas.js";

const app = express();
const PORT = process.env.ONCHAIN_SERVICE_PORT || 3000;

// Parse JSON request bodies

app.use(express.json());

// API server status

app.get("/status", (_req, res) => {
  res.json({
    status: "ok",
    service: "thetanuts-api-server",
  });
});

// Market data endpoint for AI agent
app.post("/market-data", async (req, res) => {
  try {
    const request = req.body as MarketDataRequest;

    if (!request.asset) {
      return res.status(400).json({ error: "Missing required field: asset" });
    }
    if (
      typeof request.includeOptions !== "boolean" ||
      typeof request.includeMarketState !== "boolean"
    ) {
      return res.status(400).json({
        error: "includeOptions and includeMarketState must be boolean values",
      });
    }

    const tradingData = await fetchTradingMarketData({
      asset: request.asset,
      includeOptions: request.includeOptions,
      includeMarketState: request.includeMarketState,
    });

    // Apply post-fetch filtering to the option book, if present
    console.log("=== FILTER REQUEST ===", JSON.stringify(request, null, 2));

    if (tradingData.optionBook) {
      tradingData.optionBook = {
        ...tradingData.optionBook,
        orders: filterOptionBook(tradingData.optionBook.orders, request),
      };
    }

    return res.json(tradingData);
  } catch (error) {
    console.error("Market data request failed:", error);
    return res.status(500).json({ error: "Failed to fetch market data" });
  }
});


// IMPORTANT: Keep the server listening so the process stays active
app.listen(PORT, () => {
  console.log(`Express API server running on http://localhost:${PORT}`);
});