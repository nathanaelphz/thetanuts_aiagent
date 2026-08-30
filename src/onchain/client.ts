import { ethers } from "ethers";
import { ThetanutsClient } from "@thetanuts-finance/thetanuts-client";
import * as dotenv from "dotenv";
dotenv.config();

export const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
export const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

export const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  signer,
});

// Minimal ERC20 ABI — just enough to read balance and decimals
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export async function checkConnection() {
  const address = await signer.getAddress();
  const ethBalance = await provider.getBalance(address);

  // USDC balance (ERC20 token, different from native ETH)
  const usdcToken = client.chainConfig?.tokens?.USDC;
  if (!usdcToken) {
    throw new Error('USDC token not configured in chainConfig');
  }
  const usdcAddress = usdcToken.address;
  const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
  const usdcBalance = await usdcContract.balanceOf?.(address);
  const usdcDecimals = await usdcContract.decimals?.();

  console.log(`[${new Date().toISOString()}] Wallet check`);
  console.log(`  Address: ${address}`);
  console.log(`  ETH balance:  ${ethers.formatEther(ethBalance)} ETH  (gas token)`);
  console.log(`  USDC balance: ${ethers.formatUnits(usdcBalance, usdcDecimals)} USDC  (trading collateral)`);

  return { address, ethBalance, usdcBalance };
}