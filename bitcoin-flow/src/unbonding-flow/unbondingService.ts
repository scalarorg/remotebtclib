import * as vault from "../../../vault/src/index";
import * as utils from "../utils";

export async function unbondingService(
  stakerAddress: string,
  hexTx: string,
  covs: string[],
  quorum: number,
  receiveAddress: string,
  feeRate: number,
  rbf: boolean,
) {
  // Step 1: staker create unbonding transaction,
  // sign it and send with burning request to ETH
  const unStaker = new vault.UnStaker(stakerAddress, hexTx, covs, quorum);
  const {
    psbt: unsignedPsbt,
    feeEstimate: fee,
    burningLeaf,
  } = await unStaker.getUnsignedBurningPsbt(receiveAddress, feeRate, rbf);

  // simulate staker sign the psbt
  const stakerSignedPsbt = await utils.psbt.signPsbt(
    process.env.stakerWIF!,
    unsignedPsbt.toBase64(),
    false,
  );

  // Step 2: this Psbt will be sent to bla bla ... then received by relayer of service dApp
  // the service dApp will sign the psbt, finalize it and send to bitcoin network

  // simulate service sign the psbt
  const serviceSignedPsbt = await utils.psbt.signPsbt(
    process.env.serviceWIF!,
    stakerSignedPsbt.toBase64(),
    true,
  );

  const hexTxfromPsbt = serviceSignedPsbt.extractTransaction().toHex();

  return { hexTxfromPsbt, fee };
}
