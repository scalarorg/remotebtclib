import * as bitcoin from "bitcoinjs-lib";
import * as unsignedTransaction from "./transaction/unsignedPsbt";
import { getAddressType } from "./utils/bitcoin";
import { UTXO } from "./types/utxo";
import {
  opCodeLength,
  tagLength,
  versionLength,
  BtcXOnlyPubkeyLength,
  EthAddressLength,
} from "./utils/constants";
import * as ecc from "tiny-secp256k1";
import ECPairFactory from "ecpair";
import { Leaf } from "./types/spendType";
// Initialize the ECC library
bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);

export class Staker {
  #stakerAddress: string;
  #stakerPubkey: string;
  #protocolPubkey: string;
  #covenantPubkey: string[];
  #qorum: number;
  #tag: string;
  #version: number;
  #chainID: string;
  #chainIdUserAddress: string;
  #chainSmartContractAddress: string;
  #mintingAmount: string;
  constructor(
    stakerAddress: string,
    stakerPubkey: string,
    protocolPubkey: string,
    covenantPubkey: string[],
    qorum: number,
    tag: string,
    version: number,
    chainID: string,
    chainIdUserAddress: string,
    chainSmartContractAddress: string,
    mintingAmount: string
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
  }

  async getUnsignedVaultPsbt(
    btcUtxos: UTXO[],
    stakingAmount: number,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number }> {
    // Need to check the validity of the stakingAmount and mintingAmount
    if (this.#mintingAmount.includes(".")) {
      throw new Error("Invalid mintingAmount");
    }
    if (isNaN(Number(this.#mintingAmount))) {
      throw new Error("Invalid mintingAmount");
    }
    const num = parseInt(this.#mintingAmount);
    if (num > stakingAmount) {
      throw new Error("minting amount is greater than staking amount");
    }
    const staker = await this.getStaker();
    const { psbt, feeEstimate } = await staker.getVaultPsbt({
      btcUtxos: btcUtxos,
      stakingAmount: stakingAmount,
      feeRate: feeRate,
      rbf: rbf,
    });
    return { psbt, feeEstimate };
  }

  async getUnsignedBurningPsbt(
    signedVaultTransactionHex: string,
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number; burningLeaf: Leaf }> {
    const staker = await this.getStaker();
    const tapLeaves = await staker.getTapLeavesScript();
    const { psbt, feeEstimate } = await staker.getBurningPsbt({
      preUtxoHex: signedVaultTransactionHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate, burningLeaf: tapLeaves.burningLeaf };
  }

  async getUnsignedSlashingOrLostKeyPsbt(
    signedVaultPsbtHex: string,
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number; SolLeaf: Leaf }> {
    const staker = await this.getStaker();
    const tapLeaves = await staker.getTapLeavesScript();
    const { psbt, feeEstimate } = await staker.getSlashingOrLostKeyPsbt({
      preUtxoHex: signedVaultPsbtHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate, SolLeaf: tapLeaves.slashingOrLostKeyLeaf };
  }

  async getUnsignedBurnWithoutDAppPsbt(
    signedVaultPsbtHex: string,
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number; BWoD: Leaf }> {
    const staker = await this.getStaker();
    const tapLeaves = await staker.getTapLeavesScript();
    const { psbt, feeEstimate } = await staker.getBurnWithoutDAppPsbt({
      preUtxoHex: signedVaultPsbtHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate, BWoD: tapLeaves.burnWithoutDAppLeaf };
  }

  setCovenantPubkey(covenantPubkey: string[]): void {
    for (let i = 0; i < covenantPubkey.length; i++) {
      this.#covenantPubkey[i] = covenantPubkey[i];
    }
  }
  setProtocolPubkey(protocolPubkey: string): void {
    this.#protocolPubkey = protocolPubkey;
  }
  setQorum(qorum: number): void {
    this.#qorum = qorum;
  }
  async getProtocolPubkey(): Promise<string> {
    return this.#protocolPubkey;
  }
  async getQorum(): Promise<number> {
    return this.#qorum;
  }
  async getStaker(): Promise<unsignedTransaction.VaultTransaction> {
    const networkType = getAddressType(this.#stakerAddress)[1];
    const stakerPubkeyBuffer = Buffer.from(this.#stakerPubkey, "hex");
    if (stakerPubkeyBuffer.length !== 33) {
      throw new Error("Invalid staker pubkey");
    }
    const protocolPubkeyBuffer = Buffer.from(this.#protocolPubkey, "hex");
    if (protocolPubkeyBuffer.length !== 33) {
      throw new Error("Invalid protocol pubkey");
    }
    const covenantPubkeyBuffer = this.#covenantPubkey.map((v) =>
      Buffer.from(v, "hex")
    );
    for (let i = 0; i < covenantPubkeyBuffer.length; i++) {
      if (covenantPubkeyBuffer[i].length !== 33) {
        throw new Error("Invalid covenant pubkey");
      }
    }

    if (this.#qorum > this.#covenantPubkey.length) {
      throw new Error("Invalid qorum");
    }

    const tagBuffer = Buffer.from(this.#tag, "hex");
    if (tagBuffer.length !== 4) {
      throw new Error("Invalid tag");
    }
    const versionBuffer = Buffer.alloc(1);
    versionBuffer.writeUInt8(this.#version);
    if (versionBuffer.length !== 1) {
      throw new Error("Invalid version");
    }
    const chainIDBuffer = Buffer.from(this.#chainID, "hex");
    const bytes_8_chainID = Buffer.alloc(8);
    chainIDBuffer.copy(bytes_8_chainID, 8 - chainIDBuffer.length);

    if (bytes_8_chainID.length !== 8) {
      throw new Error("Invalid chainID");
    }
    const chainIdUserAddressBuffer = Buffer.from(
      this.#chainIdUserAddress,
      "hex"
    );
    if (chainIdUserAddressBuffer.length !== 20) {
      throw new Error("Invalid chainIdUserAddress");
    }
    const chainSmartContractAddressBuffer = Buffer.from(
      this.#chainSmartContractAddress,
      "hex"
    );
    if (chainSmartContractAddressBuffer.length !== 20) {
      throw new Error("Invalid chainSmartContractAddress");
    }
    // check valid mintingAmount
    // it must be a number
    // if it in form : xxxxx.yyyyy
    // we need to ensure that len(xxxxx) <= 8 and len(yyyyy) <= 8
    try {
      parseInt(this.#mintingAmount);
    } catch (e) {
      throw new Error("Invalid mintingAmount");
    }
    const num = parseInt(this.#mintingAmount);
    const mintingAmountBuffer = Buffer.alloc(8);
    mintingAmountBuffer.writeBigUInt64BE(BigInt(num));
    return new unsignedTransaction.VaultTransaction(
      this.#stakerAddress,
      stakerPubkeyBuffer,
      protocolPubkeyBuffer,
      covenantPubkeyBuffer,
      this.#qorum,
      tagBuffer,
      versionBuffer,
      bytes_8_chainID,
      chainIdUserAddressBuffer,
      chainSmartContractAddressBuffer,
      mintingAmountBuffer,
      networkType
    );
  }
}

export class UnStaker {
  #stakerAddress: string;
  #vaultTransactionHex: string;
  #covenantPubkey: string[];
  #qorum: number;
  constructor(
    stakerAddress: string,
    vaultTransactionHex: string,
    covenantPubkey: string[],
    qorum: number
  ) {
    this.#stakerAddress = stakerAddress;
    this.#vaultTransactionHex = vaultTransactionHex;
    this.#covenantPubkey = covenantPubkey;
    this.#qorum = qorum;
  }
  async getUnsignedBurningPsbt(
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number; burningLeaf: Leaf }> {
    const staker = await this.getStaker();
    const tapLeaves = await staker.getTapLeavesScript();
    const { psbt, feeEstimate } = await staker.getBurningPsbt({
      preUtxoHex: this.#vaultTransactionHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate, burningLeaf: tapLeaves.burningLeaf };
  }

  async getUnsignedSlashingOrLostKeyPsbt(
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number; SolLeaf: Leaf }> {
    const staker = await this.getStaker();
    const tapLeaves = await staker.getTapLeavesScript();
    const { psbt, feeEstimate } = await staker.getSlashingOrLostKeyPsbt({
      preUtxoHex: this.#vaultTransactionHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate, SolLeaf: tapLeaves.slashingOrLostKeyLeaf };
  }

  async getUnsignedBurnWithoutDAppPsbt(
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number; BWoD: Leaf }> {
    const staker = await this.getStaker();
    const tapLeaves = await staker.getTapLeavesScript();
    const { psbt, feeEstimate } = await staker.getBurnWithoutDAppPsbt({
      preUtxoHex: this.#vaultTransactionHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate, BWoD: tapLeaves.burnWithoutDAppLeaf };
  }

  async getStaker(): Promise<unsignedTransaction.VaultTransaction> {
    const vaultTransaction = bitcoin.Transaction.fromHex(
      this.#vaultTransactionHex
    );

    const stakingData = vaultTransaction.outs[1].script;
    // Recover the staker and protocol pubkey
    // We only just rebuild the script, so we no need to determine the odd or even, so we just add 0x00 at the beginning of the pubkey
    const StakerPubkeyBuffer = Buffer.concat([
      Buffer.alloc(1),
      stakingData.subarray(
        opCodeLength + tagLength + versionLength,
        opCodeLength + tagLength + versionLength + BtcXOnlyPubkeyLength
      ),
    ]);
    if (StakerPubkeyBuffer.length !== 33) {
      throw new Error("Invalid staker pubkey");
    }

    const ProtocolPubkeyBuffer = Buffer.concat([
      Buffer.alloc(1),
      stakingData.subarray(
        opCodeLength + tagLength + versionLength + BtcXOnlyPubkeyLength,
        opCodeLength + tagLength + versionLength + BtcXOnlyPubkeyLength * 2
      ),
    ]);
    if (ProtocolPubkeyBuffer.length !== 33) {
      throw new Error("Invalid protocol pubkey");
    }

    const covenantPubkeyBuffer = this.#covenantPubkey.map((v) =>
      Buffer.from(v, "hex")
    );
    for (let i = 0; i < covenantPubkeyBuffer.length; i++) {
      if (covenantPubkeyBuffer[i].length !== 33) {
        throw new Error("Invalid covenant pubkey");
      }
    }
    if (this.#qorum > this.#covenantPubkey.length) {
      throw new Error("Invalid qorum");
    }

    const [addressType, networkType] = getAddressType(this.#stakerAddress);
    return new unsignedTransaction.VaultTransaction(
      this.#stakerAddress,
      StakerPubkeyBuffer,
      ProtocolPubkeyBuffer,
      covenantPubkeyBuffer,
      this.#qorum,
      Buffer.alloc(tagLength),
      Buffer.alloc(versionLength),
      Buffer.alloc(0),
      Buffer.alloc(EthAddressLength),
      Buffer.alloc(EthAddressLength),
      Buffer.alloc(0),
      networkType
    );
  }
}
