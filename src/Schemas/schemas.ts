// Market & Options Data Contracts
// Shared contract between the TypeScript SDK and AI agent

/*
Greeks associated with an option
*/

export interface OptionGreeks {
    delta: number;
    iv: number;
    gamma: number;
    theta: number;
    vega: number;
}

/*
A single option order retrived from Thetanuts Optionbook

This is the normalized representation used by the application
*/

export interface OptionOrder {
    maker: string;
    orderExpiryTimestamp: number;
    expiry: number;
    collateral: string;
    isCall: boolean;
    priceFeed: string;
    implementation: string;
    isLong: boolean;
    maxCollateralUsable: string;
    strikes: number[];
    price: string;
    numContracts: string;
    extraOptionData: string;
    signature: string;
    nonce: string;
    greeks?: OptionGreeks;
}

/*
The Available options from Thetanuts Optionbook.
*/

export interface OptionBookData {
    chainId: number;
    optionBookAddress: string;
    orders: OptionOrder[];
    lastUpdated: number;
    currentTime: number;
}

/*
Current underlying market condition
*/

export interface MarketState {
    prices: Record<string, number>;
    volatility: Record<string, 
    {
        current: number;
        forecast: number[];
    }
    >;
}

/*
Combined market information given to the AI agent
*/

export interface TradingMarketData {
    market: MarketState;
    optionBook: OptionBookData;
    retrievedAt: number;
}

/* 
Request made by AI agent when it needs market data
*/

export interface MarketDataRequest {
    asset: string;
    includeOptions: boolean;
    includeMarket: boolean;
    optionType?: "call" | "put" | "both";
    side?: "long" | "short" | "both";
    expiryAfter?: number;
    expiryBefore?: number;
    strikeMin?: number;
    strikeMax?: number;
    limit?: number;
}