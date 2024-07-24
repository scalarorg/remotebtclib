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
  protocolPubkey: Buffer,
  covenantPubkey: Buffer[],
  qorum: number,
  networkType: bitcoin.Network // use bitcoinjs-lib network
): Promise<bitcoin.payments.Payment> {
  const tapLeaves = new scripts.StakerScript(
    stakerPubKey,
    protocolPubkey,
    covenantPubkey,
    qorum
  ).buildingScript();
  const tapTree: any = [
    {
      output: tapLeaves.burnWithoutDAppScript,
    },
    [
      {
        output: tapLeaves.slashingOrLostKeyScript,
      },
      {
        output: tapLeaves.burningScript,
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
  protocolPubkey: Buffer,
  covenantPubkey: Buffer[],
  qorum: number,
  networkType: bitcoin.Network
): Promise<SpendingLeaves> {
  const tapLeaves = new scripts.StakerScript(
    stakerPubKey,
    protocolPubkey,
    covenantPubkey,
    qorum
  ).buildingScript();
  const tapTree: any = [
    {
      output: tapLeaves.burnWithoutDAppScript,
    },
    [
      {
        output: tapLeaves.slashingOrLostKeyScript,
      },
      {
        output: tapLeaves.burningScript,
      },
    ],
  ];
  const tapScripts = new scripts.SpendScript(
    tapLeaves.burningScript,
    tapLeaves.slashingOrLostKeyScript,
    tapLeaves.burnWithoutDAppScript,
    tapTree,
    networkType
  ).bulidingLeaves();
  return tapScripts;
}

export class VaultTransaction {
  #networkType: bitcoin.Network;
  #changeAddress: string; // staker address
  #feeRate: number;
  #enableRBF: boolean;
  constructor(
    networkType: bitcoin.Network,
    changeAddress: string,
    feeRate: number,
    enableRBF: boolean = true
  ) {
    this.#networkType = networkType;
    this.#changeAddress = changeAddress;
    this.#feeRate = feeRate;
    this.#enableRBF = enableRBF;
  }
  // Get input base on @unisat - Staking Transaction: unbonding + slashing
  // Unbonding Transaction: allow output to be spent after a certain time - called UnStaking Transaction
  // Slashing Transaction: allow staker the staker to burn the fund - called Slashing Transaction
  async getVaultPsbt({
    btcUtxos,
    amount,
    stakerPubKey,
    protocolPubkey,
    covenantPubkey,
    qorum,
  }: {
    btcUtxos: UnspentOutput[];
    amount: number;
    stakerPubKey: Buffer;
    protocolPubkey: Buffer;
    covenantPubkey: Buffer[];
    qorum: number;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    toSignInputs: ToSignInput[];
  }> {
    const script_p2tr = await this.getScriptP2TR(
      stakerPubKey,
      protocolPubkey,
      covenantPubkey,
      qorum,
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
  async getBurningPsbt({
    preUtxoHex,
    stakerPubKey,
    protocolPubkey,
    covenantPubkey,
    qorum,
    fee = 0,
  }: {
    preUtxoHex: string;
    stakerPubKey: Buffer;
    protocolPubkey: Buffer;
    covenantPubkey: Buffer[];
    qorum: number;
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
      protocolPubkey,
      covenantPubkey,
      qorum
    );

    txb.addInputs([
      {
        hash: preUTXO.getId(),
        index: 0, // Index of the output in the previous transaction
        witnessUtxo: {
          script: preUTXO.outs[0].script,
          value: preUTXO.outs[0].value,
        },
        tapLeafScript: [tapLeavesScript.burningLeaf],
        sequence:  0xfffffffd, // big endian
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
  async getSlashingOrLostKeyPsbt({
    preUtxoHex,
    stakerPubKey,
    covenantPubkey,
    protocolPubkey,
    qorum,
    burnAddress, // partial or full ?
    fee = 0,
  }: {
    preUtxoHex: string;
    stakerPubKey: Buffer;
    protocolPubkey: Buffer;
    covenantPubkey: Buffer[];
    qorum: number;
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
      protocolPubkey,
      covenantPubkey,
      qorum
    );

    txb.addInputs([
      {
        hash: preUTXO.getId(),
        index: 0, // Index of the output in the previous transaction
        witnessUtxo: {
          script: preUTXO.outs[0].script,
          value: preUTXO.outs[0].value,
        },
        tapLeafScript: [tapLeavesScript.slashingOrLostKeyLeaf],
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

  async getBurnWithoutDAppPsbt({
    preUtxoHex,
    stakerPubKey,
    covenantPubkey,
    protocolPubkey,
    qorum,
    burnAddress, // partial or full ?
    fee = 0,
  }: {
    preUtxoHex: string;
    stakerPubKey: Buffer;
    protocolPubkey: Buffer;
    covenantPubkey: Buffer[];
    qorum: number;
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
      protocolPubkey,
      covenantPubkey,
      qorum
    );

    txb.addInputs([
      {
        hash: preUTXO.getId(),
        index: 0, // Index of the output in the previous transaction
        witnessUtxo: {
          script: preUTXO.outs[0].script,
          value: preUTXO.outs[0].value,
        },
        tapLeafScript: [tapLeavesScript.burnWithoutDAppLeaf],
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
    protocolPubkey: Buffer,
    covenantPubkey: Buffer[],
    qorum: number,
  ): Promise<bitcoin.payments.Payment> {
    const script_p2tr = await getTaprootAddress(
      stakerPubKey,
      protocolPubkey,
      covenantPubkey,
      qorum,
      this.#networkType
    );
    return script_p2tr;
  }
  async getTapLeavesScript(
    stakerPubKey: Buffer,
    protocolPubkey: Buffer,
    covenantPubkey: Buffer[],
    qorum: number
  ): Promise<SpendingLeaves> {
    const tapScripts = await getTapLeafScript(
      stakerPubKey,
      protocolPubkey,
      covenantPubkey,
      qorum,
      this.#networkType
    );
    return tapScripts;
  }
}
