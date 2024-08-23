import * as vault from "../../../vault/src/index";
import * as utils from "../utils";
import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import { globalParams } from "../global-params";
import { PsbtInput } from "bip174/src/lib/interfaces";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

interface signRequest {
  stakingOutputPkScriptHex: string;
  unbondingPsbtBase64: string;
  stakerSignatureHex: string;
  covenantPublicKeyHex: string;
}

export async function unbondingCovenants(
  stakerAddress: string,
  hexTx: string,
  covs: string[],
  quorum: number,
  receiveAddress: string,
  feeRate: number,
  rbf: boolean
) {
  // Step 1: staker create unbonding transaction,
  // sign it and send with burning request to ETH
  const unStaker = new vault.UnStaker(stakerAddress, hexTx, covs, quorum);
  const {
    psbt: unsignedPsbt,
    feeEstimate: fee,
    BWoD,
  } = await unStaker.getUnsignedBurnWithoutDAppPsbt(
    receiveAddress,
    feeRate,
    rbf
  );

  // simulate staker sign the psbt
  const stakerSignedPsbt = await utils.psbt.signPsbt(
    process.env.stakerWIF!,
    unsignedPsbt.toBase64(),
    false
  );

  // Step 2: this Psbt will be sent to bla bla ... then received by relayer of Scalar
  const stakerSig = utils.psbt.extractSignature(stakerSignedPsbt);

  const covSigs = await processUnbondingCovenants(unsignedPsbt, stakerSig);

  const signedPsbt = await processPsbt(
    stakerSig,
    covSigs,
    stakerSignedPsbt,
    BWoD
  );

  const hexTxfromPsbt = signedPsbt.extractTransaction().toHex();

  return { hexTxfromPsbt, fee };
}

async function processUnbondingCovenants(
  stakerSignedPsbt: bitcoin.Psbt,
  stakerSig: Buffer
) {
  const stakingOutputPkScriptHex = utils.psbt.extractOutputPkHex(stakerSignedPsbt);
  let covSigs = [];
  for (let i = 0; i < globalParams.covPublicKeys.length; i++) {
    const request: signRequest = {
      stakingOutputPkScriptHex,
      unbondingPsbtBase64: stakerSignedPsbt.toBase64(),
      stakerSignatureHex: stakerSig.toString("hex"),
      covenantPublicKeyHex: globalParams.covPublicKeys[i],
    };
    const sig = await processRequestSign(request, i);
    covSigs.push(sig);
  }
  return covSigs;
}

async function processPsbt(
  stakerSig: Buffer,
  covSigs: Buffer[],
  stakerSignedPsbt: bitcoin.Psbt,
  leaf: vault.Leaf
) {
  const covSigMap = new Map<string, Buffer>();
  for (let i = 0; i < globalParams.covPublicKeys.length; i++) {
    covSigMap.set(globalParams.covPublicKeys[i], covSigs[i]);
  }
  const sortedCovPublicKeys = globalParams.covPublicKeys.sort((a, b) =>
    Buffer.compare(
      toXOnly(Buffer.from(a, "hex")),
      toXOnly(Buffer.from(b, "hex"))
    )
  ); // sort by xOnly
  const sortedCovSigs = sortedCovPublicKeys.map((key) => covSigMap.get(key)!);

  const customFinalizer = (_inputIndex: number, input: PsbtInput) => {
    const scriptSolution: Buffer[] = [];
    for (let i = sortedCovSigs.length - 1; i >= 0; i--) {
      scriptSolution.push(sortedCovSigs[i]);
    }
    scriptSolution.push(stakerSig);
    const witness = scriptSolution
      .concat(leaf.script)
      .concat(leaf.controlBlock);
    return {
      finalScriptWitness: utils.psbt.witnessStackToScriptWitness(witness),
    };
  };
  stakerSignedPsbt.finalizeInput(0, customFinalizer);
  return stakerSignedPsbt;
}



async function processRequestSign(
  request: signRequest,
  index: number
): Promise<Buffer> {
  const signedPsbt = await utils.psbt.signPsbt(
    process.env[`covenant${index + 1}WIF`]!,
    request.unbondingPsbtBase64,
    false
  );
  const sig = utils.psbt.extractSignature(signedPsbt);
  return sig;
}
