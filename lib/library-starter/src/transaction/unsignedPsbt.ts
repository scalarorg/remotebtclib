import { NetworkType } from "@unisat/wallet-sdk/lib/network";
import { UnspentOutput } from "@unisat/wallet-sdk";
import { sendBTC } from "@unisat/wallet-sdk/lib/tx-helpers";
import { ToSignInput } from "@unisat/wallet-sdk";
import { StakerScript } from "./stakeScript";
import { NUMS} from "../taproot/BIP341";
import { toXOnly } from "@unisat/wallet-sdk/lib/utils";
import * as bitcoin from "bitcoinjs-lib";

export async function getTaprootAddress(
  stakerPubKey: Buffer,
  covenantPubkey: Buffer,
  finalityProviderPubkey: Buffer,
  timeLock: number,
  networkType: bitcoin.Network
) {
  const tapLeaves = new StakerScript(
    stakerPubKey,
    covenantPubkey,
    finalityProviderPubkey,
    timeLock
  ).buildingScript();
  const tapTree: any = [
    {
      output: tapLeaves.timeLockScript,
    },
    [
      {
        output: tapLeaves.unBondingScript,
      },
      {
        output: tapLeaves.slashingScript,
      },
    ],
  ];
  // Gen taproot address
  const script_p2tr = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(Buffer.from(NUMS, "hex")),
    scriptTree: tapTree,
    network: networkType,
  });
  return script_p2tr.address;
}

// Base on @unisat
export async function getUnsignedPsbt({
  btcUtxos,
  tos,
  networkType,
  changeAddress,
  feeRate,
  enableRBF,
}: {
  btcUtxos: UnspentOutput[];
  tos: { address: string; satoshis: number }[];
  networkType: NetworkType;
  changeAddress: string;
  feeRate: number;
  enableRBF?: boolean;
}): Promise<{
  psbt: import("bitcoinjs-lib").Psbt;
  toSignInputs: ToSignInput[];
}> {
  const { psbt, toSignInputs } = await sendBTC({
    btcUtxos,
    tos,
    networkType,
    changeAddress,
    feeRate,
    enableRBF,
  });
  return { psbt, toSignInputs };
}
