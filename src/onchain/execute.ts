import { client } from "./client.js";
import { log } from "./logger.js";
import {
  isThetanutsError,
  OrderExpiredError,
  InsufficientAllowanceError,
  ContractRevertError,
} from "@thetanuts-finance/thetanuts-client";

export async function fillOrder(order: any, usdcAmount: bigint) {
  log("FILL_ORDER", "Starting fill order process", {
    orderId: order.id ?? "unknown",
    usdcAmount: usdcAmount.toString(),
  });

  // Step A: Approve USDC spending
  log("FILL_ORDER", "Approving USDC allowance...");
  const usdcToken = client.chainConfig?.tokens?.USDC;
  const optionBookAddress = client.chainConfig?.contracts?.optionBook;
  if (!usdcToken || !optionBookAddress) {
    throw new Error('USDC token or optionBook contract not configured');
  }
  await client.erc20.ensureAllowance(
    usdcToken.address,
    optionBookAddress,
    usdcAmount
  );
  log("FILL_ORDER", "Allowance approved ✅");

  // Step B: Submit the fill transaction
  try {
    log("FILL_ORDER", "Submitting fillOrder transaction...");
    const tx = await client.optionBook.fillOrder(order, usdcAmount);
    log("FILL_ORDER", "Transaction submitted, waiting for confirmation...", {
      txHash: tx.hash,
    });

    // Step C: Transaction is already mined, tx is the receipt
    const receipt = tx;

    // Step D: Check whether it actually succeeded on-chain
    if (receipt?.status === 1) {
      log("FILL_ORDER", "✅ Trade CONFIRMED successfully", {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        basescanLink: `https://basescan.org/tx/${receipt.hash}`,
      });
    } else {
      log("FILL_ORDER", "❌ Trade FAILED on-chain (reverted)", {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
      throw new Error(`Transaction reverted on-chain: ${receipt.hash}`);
    }

    return receipt;
  } catch (error) {
    // Step E: Handle and log known error types
    if (error instanceof OrderExpiredError) {
      log("FILL_ORDER", "❌ Order expired mid-flight", { error: error.message });
      throw new Error("Order expired — refetch and retry");
    } else if (error instanceof InsufficientAllowanceError) {
      log("FILL_ORDER", "❌ Allowance issue", { error: error.message });
      throw new Error("Allowance not set correctly");
    } else if (error instanceof ContractRevertError) {
      log("FILL_ORDER", "❌ Contract reverted", {
        message: error.message,
        cause: error.cause,
      });
      throw error;
    } else if (isThetanutsError(error)) {
      log("FILL_ORDER", `❌ SDK error [${error.code}]`, { message: error.message });
      throw error;
    }
    log("FILL_ORDER", "❌ Unexpected error", { error: String(error) });
    throw error;
  }
}