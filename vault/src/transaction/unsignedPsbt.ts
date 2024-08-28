import * as ecc from "@bitcoinerlab/secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import { ECPairFactory, ECPairInterface } from "ecpair";

import { NUMS } from "../bip/bip341";
import { EmbeddedDataScript, SpendingLeaves } from "../types/spendType";
import { UTXO } from "../types/utxo";
import { getAddressType, prepareTx, toPsbt } from "../utils/bitcoin";

import * as scripts from "./scripts";

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

export async function getTaprootAddress(
  stakerPubKey: Buffer,
  protocolPubkey: Buffer,
  covenantPubkey: Buffer[],
  qorum: number,
  tag: Buffer,
  version: Buffer,
  chainID: Buffer,
  chainIdUserAddress: Buffer,
  chainSmartContractAddress: Buffer,
  mintingAmount: Buffer,
  networkType: bitcoin.Network,
): Promise<bitcoin.payments.Payment> {
  const tapLeaves = new scripts.StakerScript(
    stakerPubKey,
    protocolPubkey,
    covenantPubkey,
    qorum,
    tag,
    version,
    chainID,
    chainIdUserAddress,
    chainSmartContractAddress,
    mintingAmount,
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
  tag: Buffer,
  version: Buffer,
  chainID: Buffer,
  chainIdUserAddress: Buffer,
  chainSmartContractAddress: Buffer,
  mintingAmount: Buffer,
  networkType: bitcoin.Network,
): Promise<SpendingLeaves> {
  const tapLeaves = new scripts.StakerScript(
    stakerPubKey,
    protocolPubkey,
    covenantPubkey,
    qorum,
    tag,
    version,
    chainID,
    chainIdUserAddress,
    chainSmartContractAddress,
    mintingAmount,
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
    networkType,
  ).bulidingLeaves();
  return tapScripts;
}

export async function getEmbeddedScript(
  stakerPubKey: Buffer,
  protocolPubkey: Buffer,
  covenantPubkey: Buffer[],
  qorum: number,
  tag: Buffer,
  version: Buffer,
  chainID: Buffer,
  chainIdUserAddress: Buffer,
  chainSmartContractAddress: Buffer,
  mintingAmount: Buffer,
  networkType: bitcoin.Network,
): Promise<EmbeddedDataScript> {
  const VaultScript = new scripts.StakerScript(
    stakerPubKey,
    protocolPubkey,
    covenantPubkey,
    qorum,
    tag,
    version,
    chainID,
    chainIdUserAddress,
    chainSmartContractAddress,
    mintingAmount,
  ).buildingScript();

  const embeddedScript = new scripts.EmbeddedScript(
    VaultScript.stakingDataScript,
    VaultScript.mintingDataScript,
    networkType,
  ).buildEmbeddedScript();
  return embeddedScript;
}

export class VaultTransaction {
  #stakerAddress: string;
  #stakerPubkey: Buffer;
  #protocolPubkey: Buffer;
  #covenantPubkey: Buffer[];
  #qorum: number;
  #tag: Buffer;
  #version: Buffer;
  #chainID: Buffer;
  #chainIdUserAddress: Buffer;
  #chainSmartContractAddress: Buffer;
  #mintingAmount: Buffer;
  #networkType: bitcoin.Network;
  #enableRBF: boolean;
  constructor(
    stakerAddress: string,
    stakerPubkey: Buffer,
    protocolPubkey: Buffer,
    covenantPubkey: Buffer[],
    qorum: number,
    tag: Buffer,
    version: Buffer,
    chainID: Buffer,
    chainIdUserAddress: Buffer,
    chainSmartContractAddress: Buffer,
    mintingAmount: Buffer,
    networkType: bitcoin.Network,
    enableRBF: boolean = true,
  ) {
    this.#stakerAddress = stakerAddress;
    this.#stakerPubkey = stakerPubkey;
    this.#protocolPubkey = protocolPubkey;
    this.#covenantPubkey = covenantPubkey;
    this.#qorum = qorum;
    this.#tag = tag;
    this.#version = version;
    this.#chainID = chainID;
    this.#chainIdUserAddress = chainIdUserAddress;
    this.#chainSmartContractAddress = chainSmartContractAddress;
    this.#mintingAmount = mintingAmount;
    this.#networkType = networkType;
    this.#enableRBF = enableRBF;
  }
  // Get input base on @unisat - Staking Transaction: unbonding + slashing
  // Unbonding Transaction: allow output to be spent after a certain time - called UnStaking Transaction
  // Slashing Transaction: allow staker the staker to burn the fund - called Slashing Transaction
  async getVaultPsbt({
    btcUtxos,
    stakingAmount,
    feeRate,
    rbf,
  }: {
    btcUtxos: UTXO[];
    stakingAmount: number;
    feeRate: number;
    rbf: boolean;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    feeEstimate: number;
  }> {
    const script_p2tr = await this.getScriptP2TR();
    const embeddedScript = await this.getEmbeddedScript();
    const staking_data_script = embeddedScript.stakingDataScript;
    const minting_data_script = embeddedScript.mintingDataScript;
    const outputs = [
      {
        address: script_p2tr.address!,
        value: stakingAmount,
      },
      {
        script: staking_data_script,
        value: 0,
      },
      {
        script: minting_data_script,
        value: 0,
      },
    ];
    let { ok, error } = prepareTx({
      inputs: [],
      outputs,
      regularUTXOs: btcUtxos,
      feeRate,
      address: this.#stakerAddress,
    });

    if (!ok) {
      throw new Error(error);
    }

    const txb = toPsbt({ tx: ok, pubkey: this.#stakerPubkey, rbf });

    return {
      psbt: txb,
      feeEstimate: ok.fee,
    };
  }
  async getBurningPsbt({
    preUtxoHex,
    burnAddress,
    feeRate,
    rbf,
  }: {
    preUtxoHex: string;
    burnAddress: string;
    feeRate: number;
    rbf: boolean;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    feeEstimate: number;
  }> {
    const txb = new bitcoin.Psbt({ network: this.#networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const tapLeavesScript = await this.getTapLeavesScript();

    let sequence = 0xffffffff;
    if (rbf) {
      sequence = 0xfffffffd;
    }
    const fee = await this.getFeeEstimateBurning({
      preUtxoHex,
      burnAddress,
      feeRate,
      rbf,
    });

    txb.addInput({
      hash: preUTXO.getId(),
      index: 0, // Index of the output in the previous transaction
      witnessUtxo: {
        script: preUTXO.outs[0].script,
        value: preUTXO.outs[0].value,
      },
      tapLeafScript: [tapLeavesScript.burningLeaf],
      sequence: sequence, // big endian
    });
    txb.addOutputs([
      {
        address: burnAddress,
        value: preUTXO.outs[0].value - fee, // Amount in satoshis
      },
    ]);
    return {
      psbt: txb,
      feeEstimate: fee,
    };
  }
  async getSlashingOrLostKeyPsbt({
    preUtxoHex,
    burnAddress, // partial or full ?
    feeRate,
    rbf,
  }: {
    preUtxoHex: string;
    burnAddress: string;
    feeRate: number;
    rbf: boolean;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    feeEstimate: number;
  }> {
    const [addressType, networkType] = getAddressType(this.#stakerAddress);
    const txb = new bitcoin.Psbt({ network: networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const tapLeavesScript = await this.getTapLeavesScript();

    let sequence = 0xffffffff;
    if (rbf) {
      sequence = 0xfffffffd;
    }

    const fee = await this.getFeeEstimateSlashingOrLostKey({
      preUtxoHex,
      burnAddress,
      feeRate,
      rbf,
    });

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
      feeEstimate: fee,
    };
  }

  async getBurnWithoutDAppPsbt({
    preUtxoHex,
    burnAddress,
    feeRate,
    rbf,
  }: {
    preUtxoHex: string;
    burnAddress: string;
    feeRate: number;
    rbf: boolean;
  }): Promise<{
    psbt: import("bitcoinjs-lib").Psbt;
    feeEstimate: number;
  }> {
    const [addressType, networkType] = getAddressType(this.#stakerAddress);
    const txb = new bitcoin.Psbt({ network: networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const tapLeavesScript = await this.getTapLeavesScript();

    let sequence = 0xffffffff;
    if (rbf) {
      sequence = 0xfffffffd;
    }

    const fee = await this.getFeeEstimateBurnWithoutDApp({
      preUtxoHex,
      burnAddress,
      feeRate,
      rbf,
    });

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
      feeEstimate: fee,
    };
  }

  async genRandomVaultScript(): Promise<{
    random_staker_keyPair: ECPairInterface;
    random_protocol_keyPair: ECPairInterface;
    random_covenant_keyPair: ECPairInterface[];
    random_script_p2tr: bitcoin.payments.Payment;
    random_tapLeaves: SpendingLeaves;
  }> {
    const addressType = getAddressType(this.#stakerAddress)[0];
    const random_staker_keyPair = ECPair.makeRandom({
      network: this.#networkType,
    });
    const random_protocol_keyPair = ECPair.makeRandom({
      network: this.#networkType,
    });
    const random_covenant_keyPair = [];
    for (let i = 0; i < this.#covenantPubkey.length; i++) {
      random_covenant_keyPair.push(
        ECPair.makeRandom({
          network: this.#networkType,
        }),
      );
    }
    const random_script_p2tr = await getTaprootAddress(
      random_staker_keyPair.publicKey,
      random_protocol_keyPair.publicKey,
      random_covenant_keyPair.map((v) => v.publicKey),
      this.#qorum,
      this.#tag,
      this.#version,
      this.#chainID,
      this.#chainIdUserAddress,
      this.#chainSmartContractAddress,
      this.#mintingAmount,
      this.#networkType,
    );
    const random_tapLeaves = await getTapLeafScript(
      random_staker_keyPair.publicKey,
      random_protocol_keyPair.publicKey,
      random_covenant_keyPair.map((v) => v.publicKey),
      this.#qorum,
      this.#tag,
      this.#version,
      this.#chainID,
      this.#chainIdUserAddress,
      this.#chainSmartContractAddress,
      this.#mintingAmount,
      this.#networkType,
    );
    return {
      random_staker_keyPair,
      random_protocol_keyPair,
      random_covenant_keyPair,
      random_script_p2tr,
      random_tapLeaves,
    };
  }

  async getFeeEstimateBurning({
    preUtxoHex,
    burnAddress,
    feeRate,
    rbf,
  }: {
    preUtxoHex: string;
    burnAddress: string;
    feeRate: number;
    rbf: boolean;
  }): Promise<number> {
    const txb = new bitcoin.Psbt({ network: this.#networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const {
      random_staker_keyPair,
      random_protocol_keyPair,
      random_covenant_keyPair,
      random_script_p2tr,
      random_tapLeaves,
    } = await this.genRandomVaultScript();

    let sequence = 0xffffffff;
    if (rbf) {
      sequence = 0xfffffffd;
    }

    txb.addInput({
      hash: preUTXO.getId(),
      index: 0, // Index of the output in the previous transaction
      witnessUtxo: {
        script: random_script_p2tr.output!,
        value: preUTXO.outs[0].value,
      },
      tapLeafScript: [random_tapLeaves.burningLeaf],
      sequence: sequence, // big endian
    });
    txb.addOutputs([
      {
        address: burnAddress,
        value: preUTXO.outs[0].value, // Amount in satoshis
      },
    ]);
    txb.signInput(0, random_staker_keyPair);
    txb.signInput(0, random_protocol_keyPair);
    txb.finalizeAllInputs();
    const tx = txb.extractTransaction();
    return tx.virtualSize() * feeRate;
  }
  async getFeeEstimateSlashingOrLostKey({
    preUtxoHex,
    burnAddress,
    feeRate,
    rbf,
  }: {
    preUtxoHex: string;
    burnAddress: string;
    feeRate: number;
    rbf: boolean;
  }): Promise<number> {
    const txb = new bitcoin.Psbt({ network: this.#networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const {
      random_staker_keyPair,
      random_protocol_keyPair,
      random_covenant_keyPair,
      random_script_p2tr,
      random_tapLeaves,
    } = await this.genRandomVaultScript();

    let sequence = 0xffffffff;
    if (rbf) {
      sequence = 0xfffffffd;
    }

    txb.addInput({
      hash: preUTXO.getId(),
      index: 0, // Index of the output in the previous transaction
      witnessUtxo: {
        script: random_script_p2tr.output!,
        value: preUTXO.outs[0].value,
      },
      tapLeafScript: [random_tapLeaves.slashingOrLostKeyLeaf],
      sequence: sequence, // big endian
    });

    txb.addOutputs([
      {
        address: burnAddress,
        value: preUTXO.outs[0].value, // Amount in satoshis
      },
    ]);
    txb.signInput(0, random_staker_keyPair);
    txb.signInput(0, random_protocol_keyPair);
    for (let i = 0; i < random_covenant_keyPair.length; i++) {
      txb.signInput(0, random_covenant_keyPair[i]);
    }
    txb.finalizeAllInputs();
    const tx = txb.extractTransaction();
    return tx.virtualSize() * feeRate;
  }

  async getFeeEstimateBurnWithoutDApp({
    preUtxoHex,
    burnAddress,
    feeRate,
    rbf,
  }: {
    preUtxoHex: string;
    burnAddress: string;
    feeRate: number;
    rbf: boolean;
  }): Promise<number> {
    const txb = new bitcoin.Psbt({ network: this.#networkType });
    // Default setting
    txb.setVersion(2);
    txb.setLocktime(0);

    const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
    const {
      random_staker_keyPair,
      random_protocol_keyPair,
      random_covenant_keyPair,
      random_script_p2tr,
      random_tapLeaves,
    } = await this.genRandomVaultScript();

    let sequence = 0xffffffff;
    if (rbf) {
      sequence = 0xfffffffd;
    }

    txb.addInput({
      hash: preUTXO.getId(),
      index: 0, // Index of the output in the previous transaction
      witnessUtxo: {
        script: random_script_p2tr.output!,
        value: preUTXO.outs[0].value,
      },
      tapLeafScript: [random_tapLeaves.burnWithoutDAppLeaf],
      sequence: sequence, // big endian
    });

    txb.addOutputs([
      {
        address: burnAddress,
        value: preUTXO.outs[0].value, // Amount in satoshis
      },
    ]);
    txb.signInput(0, random_staker_keyPair);
    for (let i = 0; i < random_covenant_keyPair.length; i++) {
      txb.signInput(0, random_covenant_keyPair[i]);
    }
    txb.finalizeAllInputs();
    const tx = txb.extractTransaction();
    return tx.virtualSize() * feeRate;
  }

  async getScriptP2TR(): Promise<bitcoin.payments.Payment> {
    const script_p2tr = await getTaprootAddress(
      this.#stakerPubkey,
      this.#protocolPubkey,
      this.#covenantPubkey,
      this.#qorum,
      this.#tag,
      this.#version,
      this.#chainID,
      this.#chainIdUserAddress,
      this.#chainSmartContractAddress,
      this.#mintingAmount,
      this.#networkType,
    );
    return script_p2tr;
  }
  async getTapLeavesScript(): Promise<SpendingLeaves> {
    const tapScripts = await getTapLeafScript(
      this.#stakerPubkey,
      this.#protocolPubkey,
      this.#covenantPubkey,
      this.#qorum,
      this.#tag,
      this.#version,
      this.#chainID,
      this.#chainIdUserAddress,
      this.#chainSmartContractAddress,
      this.#mintingAmount,
      this.#networkType,
    );
    return tapScripts;
  }

  async getEmbeddedScript(): Promise<EmbeddedDataScript> {
    const embeddedScript = await getEmbeddedScript(
      this.#stakerPubkey,
      this.#protocolPubkey,
      this.#covenantPubkey,
      this.#qorum,
      this.#tag,
      this.#version,
      this.#chainID,
      this.#chainIdUserAddress,
      this.#chainSmartContractAddress,
      this.#mintingAmount,
      this.#networkType,
    );
    return embeddedScript;
  }
}
