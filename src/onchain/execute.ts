import { client } from "./client";
import {
  isThetanutsError,
  OrderExpiredError,
  InsufficientAllowanceError,
  ContractRevertError,
} from "@thetanuts-finance/thetanuts-client";

export async function fillOrder(order: any, usdcAmount: bigint) {
  // Step A: Approve USDC spending BEFORE filling (SDK never auto-approves)
  console.log("Approving USDC allowance...");
  await client.erc20.ensureAllowance(
    client.chainConfig.tokens.USDC.address,
    client.chainConfig.contracts.optionBook,
    usdcAmount
  );

  // Step B: Execute the fill
  try {
    console.log("Submitting trade...");
    const receipt = await client.optionBook.fillOrder(order, usdcAmount);
    console.log(`✅ Trade executed: ${receipt.hash}`);
    console.log(`🔗 Basescan: https://basescan.org/tx/${receipt.hash}`);
    return receipt;
  } catch (error) {
    // Step C: Handle known error types cleanly
    if (error instanceof OrderExpiredError) {
      throw new Error("Order expired mid-flight — refetch and retry");
    } else if (error instanceof InsufficientAllowanceError) {
      throw new Error("Allowance not set correctly — check ensureAllowance call");
    } else if (error instanceof ContractRevertError) {
      console.error("Contract reverted:", error.message, error.cause);
      throw error;
    } else if (isThetanutsError(error)) {
      console.error(`SDK error [${error.code}]: ${error.message}`);
      throw error;
    }
    throw error;
  }
}