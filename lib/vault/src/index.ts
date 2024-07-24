import { ToSignInput } from "@unisat/wallet-sdk";
import { decodeAddress } from "@unisat/wallet-sdk/lib/address";
import * as bitcoin from "bitcoinjs-lib";
import { estimateFee } from "./transaction/estimate";

import * as unsignedTransaction from "./transaction/unsignedPsbt";
export * as unsignedTransaction from "./transaction/unsignedPsbt";

// work for UNISAT
export class UNISATStaker {
  #stakerAddress: string; // unisat.getAccount()
  #stakerPubkey: string; // unisat.getPublickey()
  #protocolPubkey: string; // unisat.getPublickey()
  #covenantPubkey: string[]; 
  #qorum : number;
  #networkType: bitcoin.Network;
  #feeRate: number;
  constructor(
    stakerAddress: string,
    stakerPubkey: string,
    protocolPubkey: string,
    covenantPubkey: string[],
    qorum: number,
    networkType: bitcoin.Network,
    feeRate: number
  ) {
    this.#stakerAddress = stakerAddress;
    this.#stakerPubkey = stakerPubkey;
    this.#protocolPubkey = protocolPubkey;
    this.#covenantPubkey = covenantPubkey;
    this.#qorum = qorum;
    this.#networkType = networkType;
    this.#feeRate = feeRate;
  }
  // Include fee
  async getUnsignedVaultPsbt(
    btcUtxos: any,
    toAmount: number
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const staker = await this.getStaker();
    const addressType = decodeAddress(this.#stakerAddress).addressType;
    const { psbt, toSignInputs } = await staker.getVaultPsbt({
      btcUtxos: btcUtxos.map((v: any) => ({
        txid: v.txid,
        vout: v.vout,
        satoshis: v.satoshi,
        scriptPk: v.scriptPk,
        pubkey: this.#stakerPubkey,
        addressType,
        inscriptions: v.inscriptions,
        atomicals: [],
        rawtx: v.rawtx, // only for p2pkh
      })),
      amount: toAmount,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      covenantPubkey: this.#covenantPubkey.map((v) => Buffer.from(v, "hex")),
      qorum: this.#qorum,
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedBurningPsbtNoFee(
    signedVaultTransactionHex: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getBurningPsbt({
      preUtxoHex: signedVaultTransactionHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      covenantPubkey: this.#covenantPubkey.map((v) => Buffer.from(v, "hex")),
      qorum: this.#qorum,
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedBurningPsbt(
    signedVaultTransactionHex: string,
    noFeePsbtHex: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const tx = bitcoin.Psbt.fromHex(noFeePsbtHex).extractTransaction().toHex();
    const fee = await estimateFee(tx, this.#feeRate);
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getBurningPsbt({
      preUtxoHex: signedVaultTransactionHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      covenantPubkey: this.#covenantPubkey.map((v) => Buffer.from(v, "hex")),
      qorum: this.#qorum,
      fee,
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedSlashingOrLostKeyPsbtNoFee(
    signedVaultPsbtHex: string,
    burnAddress: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getSlashingOrLostKeyPsbt({
      preUtxoHex: signedVaultPsbtHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      covenantPubkey: this.#covenantPubkey.map((v) => Buffer.from(v, "hex")),
      qorum: this.#qorum,
      burnAddress: burnAddress,
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedSlashingOrLostKeyPsbt(
    signedVaultPsbtHex: string,
    burnAddress: string,
    noFeePsbtHex: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const tx = bitcoin.Psbt.fromHex(noFeePsbtHex).extractTransaction().toHex();
    const fee = await estimateFee(tx, this.#feeRate);
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getSlashingOrLostKeyPsbt({
      preUtxoHex: signedVaultPsbtHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      covenantPubkey: this.#covenantPubkey.map((v) => Buffer.from(v, "hex")),
      qorum: this.#qorum,
      burnAddress: burnAddress,
      fee,
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedBurnWithoutDAppPsbtNoFee(
    signedVaultPsbtHex: string,
    burnAddress: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getBurnWithoutDAppPsbt({
      preUtxoHex: signedVaultPsbtHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      covenantPubkey: this.#covenantPubkey.map((v) => Buffer.from(v, "hex")),
      qorum: this.#qorum,
      burnAddress: burnAddress,
    });
    return { psbt, toSignInputs };
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
  setFeeRate(feeRate: number): void {
    this.#feeRate = feeRate;
  }
  async getProtocolPubkey(): Promise<string> {
    return this.#protocolPubkey;
  }
  async getQorum(): Promise<number> {
    return this.#qorum;
  }
  async getFeeRate(): Promise<number> {
    return this.#feeRate;
  }
  async getStaker(): Promise<unsignedTransaction.VaultTransaction> {
    return new unsignedTransaction.VaultTransaction(
      this.#networkType,
      this.#stakerAddress,
      this.#feeRate,
    );
  }
}
