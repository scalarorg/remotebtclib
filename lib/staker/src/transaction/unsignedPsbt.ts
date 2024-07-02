import { NetworkType } from "@unisat/wallet-sdk/lib/network";
import { UnspentOutput } from "@unisat/wallet-sdk";
import { sendBTC } from "@unisat/wallet-sdk/lib/tx-helpers";
import { ToSignInput } from "@unisat/wallet-sdk";
import * as scripts from "./scripts";
import { NUMS } from "../bip/bip341";
import { toXOnly } from "@unisat/wallet-sdk/lib/utils";
import * as bitcoin from "bitcoinjs-lib";
import { SpendingLeaves } from "../type/spendType";

export async function getTaprootAddress(
  stakerPubKey: Buffer,
  covenantPubkey: Buffer,
  protocolPubkey: Buffer,
  timeLock: number,
  networkType: bitcoin.Network // use bitcoinjs-lib network
): Promise<bitcoin.payments.Payment> {
  const tapLeaves = new scripts.StakerScript(
    stakerPubKey,
    covenantPubkey,
    protocolPubkey,
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
  return script_p2tr;
}

export async function getTapLeafScript(
  stakerPubKey: Buffer,
  covenantPubkey: Buffer,
  protocolPubkey: Buffer,
  timeLock: number,
  networkType: bitcoin.Network
): Promise<SpendingLeaves> {
  const tapLeaves = new scripts.StakerScript(
    stakerPubKey,
    covenantPubkey,
    protocolPubkey,
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
  const tapScripts = new scripts.SpendScript(
    tapLeaves.timeLockScript,
    tapLeaves.unBondingScript,
    tapLeaves.slashingScript,
    tapTree,
    networkType
  ).bulidingLeaves();
  return tapScripts;
}

export class StakingTransaction {
  #networkType: bitcoin.Network;
  #changeAddress: string; // staker address
  #feeRate: number;
  #timeLock: number;
  #enableRBF: boolean;
  constructor(
    networkType: bitcoin.Network,
    changeAddress: string,
    feeRate: number,
    timeLock: number,
    enableRBF: boolean = true
  ) {
    this.#networkType = networkType;
    this.#changeAddress = changeAddress;
    this.#feeRate = feeRate;
    this.#timeLock = timeLock;
    this.#enableRBF = enableRBF;
  }
  // Get input base on @unisat - Staking Transaction: unbonding + slashing
  // Unbonding Transaction: allow output to be spent after a certain time - called UnStaking Transaction
  // Slashing Transaction: allow staker the staker to burn the fund - called Slashing Transaction
  async getStakingPsbt({
    btcUtxos,
    amount,
    stakerPubKey,
    covenantPubkey,
    protocolPubkey,
  }: {
    btcUtxos: UnspentOutput[];
    amount: number;
    stakerPubKey: Buffer;
    covenantPubkey: Buffer;
    protocolPubkey: Buffer;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    toSignInputs: ToSignInput[];
  }> {
    const script_p2tr = await this.getScriptP2TR(
      stakerPubKey,
      covenantPubkey,
      protocolPubkey
    );

    const tos = [
      {
        address: script_p2tr.address!,
        satoshis: amount,
      },
    ];
    // unisat - sendBTC
    let network;
    if (this.#networkType === bitcoin.networks.testnet) {
      network = NetworkType.TESTNET;
    } else if (this.#networkType === bitcoin.networks.regtest) {
      network = NetworkType.REGTEST;
    } else {
      network = NetworkType.MAINNET;
    }
    const { psbt, toSignInputs } = await sendBTC({
      btcUtxos,
      tos,
      networkType: network,
      changeAddress: this.#changeAddress,
      feeRate: this.#feeRate,
      enableRBF: this.#enableRBF,
    });
    return { psbt, toSignInputs };
  }
  async getUnstakingPsbt({
    preUtxoHex,
    stakerPubKey,
    covenantPubkey,
    protocolPubkey,
    fee = 0,
  }: {
    preUtxoHex: string;
    stakerPubKey: Buffer;
    covenantPubkey: Buffer;
    protocolPubkey: Buffer;
    fee?: number;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    toSignInputs: ToSignInput[];
  }> {
    const txb = new bitcoin.Psbt({ network: this.#networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const tapLeavesScript = await this.getTapLeavesScript(
      stakerPubKey,
      covenantPubkey,
      protocolPubkey
    );

    txb.addInputs([
      {
        hash: preUTXO.getId(),
        index: 0, // Index of the output in the previous transaction
        witnessUtxo: {
          script: preUTXO.outs[0].script,
          value: preUTXO.outs[0].value,
        },
        tapLeafScript: [tapLeavesScript.timeLockLeaf],
        sequence: this.#timeLock, // big endian
      },
    ]);
    txb.addOutputs([
      {
        address: this.#changeAddress,
        value: preUTXO.outs[0].value - fee, // Amount in satoshis
      },
    ]);
    return {
      psbt: txb,
      toSignInputs: [
        {
          index: 0,
          publicKey: stakerPubKey.toString("hex"),
          disableTweakSigner: true,
        },
      ],
    };
  }
  async getSlashingPsbt({
    preUtxoHex,
    stakerPubKey,
    covenantPubkey,
    protocolPubkey,
    burnAddress, // partial or full ?
    fee = 0,
  }: {
    preUtxoHex: string;
    stakerPubKey: Buffer;
    covenantPubkey: Buffer;
    protocolPubkey: Buffer;
    burnAddress: string;
    fee?: number;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    toSignInputs: ToSignInput[];
  }> {
    const txb = new bitcoin.Psbt({ network: this.#networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const tapLeavesScript = await this.getTapLeavesScript(
      stakerPubKey,
      covenantPubkey,
      protocolPubkey
    );

    txb.addInputs([
      {
        hash: preUTXO.getId(),
        index: 0, // Index of the output in the previous transaction
        witnessUtxo: {
          script: preUTXO.outs[0].script,
          value: preUTXO.outs[0].value,
        },
        tapLeafScript: [tapLeavesScript.slashingLeaf],
        sequence: 0xfffffffd, // big endian
      },
    ]);
    txb.addOutputs([
      {
        address: burnAddress,
        value: preUTXO.outs[0].value - fee, // Amount in satoshis
      },
    ]);
    return {
      psbt: txb,
      toSignInputs: [
        {
          index: 0,
          publicKey: stakerPubKey.toString("hex"),
          disableTweakSigner: true,
        },
      ],
    };
  }

  async getScriptP2TR(
    stakerPubKey: Buffer,
    covenantPubkey: Buffer,
    protocolPubkey: Buffer
  ): Promise<bitcoin.payments.Payment> {
    const script_p2tr = await getTaprootAddress(
      stakerPubKey,
      covenantPubkey,
      protocolPubkey,
      this.#timeLock,
      this.#networkType
    );
    return script_p2tr;
  }
  async getTapLeavesScript(
    stakerPubKey: Buffer,
    covenantPubkey: Buffer,
    protocolPubkey: Buffer
  ): Promise<SpendingLeaves> {
    const tapScripts = await getTapLeafScript(
      stakerPubKey,
      covenantPubkey,
      protocolPubkey,
      this.#timeLock,
      this.#networkType
    );
    return tapScripts;
  }
}
