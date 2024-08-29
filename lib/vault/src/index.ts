import { ToSignInput } from "@unisat/wallet-sdk";
import { decodeAddress } from "@unisat/wallet-sdk/lib/address";
import * as bitcoin from "bitcoinjs-lib";
import * as unsignedTransaction from "./transaction/unsignedPsbt";
import { getAddressType } from "./utils/bitcoin";
import { UTXO } from "./types/utxo";
import { bitcoin_unit } from "./bip/constant";
import { buffer } from "stream/consumers";

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
    try {
      parseInt(this.#mintingAmount);
    } catch (e) {
      throw new Error("Invalid mintingAmount");
    }
    const num = parseInt(this.#mintingAmount);
    if (num > stakingAmount) {
      throw new Error("minting amount is greater than staking amount");
    }
    const staker = await this.getStaker();
    const [addressType, networkType] = getAddressType(this.#stakerAddress);
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
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number }> {
    const staker = await this.getStaker();
    const { psbt, feeEstimate } = await staker.getBurningPsbt({
      preUtxoHex: signedVaultTransactionHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate };
  }

  async getUnsignedSlashingOrLostKeyPsbt(
    signedVaultPsbtHex: string,
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number }> {
    const staker = await this.getStaker();
    const { psbt, feeEstimate } = await staker.getSlashingOrLostKeyPsbt({
      preUtxoHex: signedVaultPsbtHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate };
  }

  async getUnsignedBurnWithoutDAppPsbt(
    signedVaultPsbtHex: string,
    burnAddress: string,
    feeRate: number,
    rbf: boolean
  ): Promise<{ psbt: bitcoin.Psbt; feeEstimate: number }> {
    const staker = await this.getStaker();
    const { psbt, feeEstimate } = await staker.getBurnWithoutDAppPsbt({
      preUtxoHex: signedVaultPsbtHex,
      burnAddress: burnAddress,
      feeRate,
      rbf,
    });
    return { psbt, feeEstimate };
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
