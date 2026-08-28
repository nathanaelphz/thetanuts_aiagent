# Thetanuts AI Trading Agent

AI agent that evaluates live Thetanuts options quotes on Base and executes 
a trade when it meets a yield-threshold strategy, using GonkaRouter for LLM reasoning.

## Structure
- `src/onchain` — wallet/provider/signer setup, fillOrder, receipt handling
- `src/strategy` — deterministic baseline rules, order scoring
- `src/agent` — LLM prompt template, GonkaRouter call, output validation
- `src/guardrails` — spending caps, pre-execution safety checks
- `main.ts` — orchestrates the full pipeline

## How to run
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your real keys
3. `npx ts-node src/main.ts`

## Live trade proof
[Basescan link — to be added once executed]