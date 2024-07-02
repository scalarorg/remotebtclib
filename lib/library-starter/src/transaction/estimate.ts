import * as bitcoin from "bitcoinjs-lib";

export async function estimateFee(
  hexSignedTransaction: string,
  feeRate: number
): Promise<number> {
  const tx = bitcoin.Transaction.fromHex(hexSignedTransaction);
  const txSize = tx.virtualSize();
  const fee = Math.ceil(txSize * feeRate);
  return fee;
}
