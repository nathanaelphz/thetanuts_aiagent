import { ethers } from "ethers";
import { ThetanutsClient } from "@thetanuts-finance/thetanuts-client";
import * as dotenv from "dotenv";
dotenv.config();

// Piece 1: Provider — your read connection to Base network
export const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);

// Piece 2: Signer — wraps your private key so you can sign transactions
export const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

// The Thetanuts client, wired to both
export const client = new ThetanutsClient({
  chainId: 8453, // Base mainnet
  provider,
  signer,
});

// Sanity check function
export async function checkConnection() {
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  console.log(`Connected wallet: ${address}`);
  console.log(`ETH balance: ${ethers.formatEther(balance)} ETH`);
}