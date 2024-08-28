import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

const ECPair = ECPairFactory(ecc);

// this function only sign the psbt with the WIF
// not finalize the psbt
// notice: the psbt must be unsigned,
//just return the psbt with signature and the signature
export async function signPsbt(
  WIF: string,
  psbtBase64: string,
  finalize: boolean = false,
): Promise<bitcoin.Psbt> {
  const keyPair = ECPair.fromWIF(WIF, bitcoin.networks.testnet);
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
  psbt.signAllInputs(keyPair);
  if (finalize) {
    psbt.finalizeAllInputs();
  }
  return psbt;
}

/**
 * Helper function that produces a serialized witness script
 * https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts#L477
 */
const varuint = require("varuint-bitcoin");
export function witnessStackToScriptWitness(witness: Array<Buffer>): Buffer {
  let buffer = Buffer.allocUnsafe(0);

  function writeSlice(slice: Buffer) {
    buffer = Buffer.concat([buffer, Buffer.from(slice)]);
  }

  function writeVarInt(i: number) {
    const currentLen = buffer.length;
    const varintLen = varuint.encodingLength(i);

    buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
    varuint.encode(i, buffer, currentLen);
  }

  function writeVarSlice(slice: Buffer) {
    writeVarInt(slice.length);
    writeSlice(slice);
  }

  function writeVector(vector: Array<Buffer>) {
    writeVarInt(vector.length);
    vector.forEach(writeVarSlice);
  }

  writeVector(witness);

  return buffer;
}

export function extractOutputPkHex(SignedPsbt: bitcoin.Psbt) {
  const stakingOutputPk =
    SignedPsbt.data.inputs[0].witnessUtxo!.script.toString("hex");
  return stakingOutputPk;
}

export function extractSignature(SignedPsbt: bitcoin.Psbt): Buffer {
  const stakerSignature = SignedPsbt.data.inputs[0].tapScriptSig![0].signature;
  return stakerSignature;
}
