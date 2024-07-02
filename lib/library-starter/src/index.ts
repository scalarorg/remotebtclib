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
  #covenantPubkey: string; // unisat.getPublickey()
  #protocolPubkey: string; // unisat.getPublickey()
  #networkType: bitcoin.Network;
  #timeLock: number;
  #feeRate: number;
  constructor(
    stakerAddress: string,
    stakerPubkey: string,
    covenantPubkey: string,
    protocolPubkey: string,
    networkType: bitcoin.Network,
    feeRate: number,
    timeLock: number
  ) {
    this.#stakerAddress = stakerAddress;
    this.#stakerPubkey = stakerPubkey;
    this.#covenantPubkey = covenantPubkey;
    this.#protocolPubkey = protocolPubkey;
    this.#networkType = networkType;
    this.#timeLock = timeLock;
    this.#feeRate = feeRate;
  }
  // Include fee
  async getUnsignedStakingPsbt(
    btcUtxos: any,
    toAmount: number
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const staker = await this.getStaker();
    const addressType = decodeAddress(this.#stakerAddress).addressType;
    const { psbt, toSignInputs } = await staker.getStakingPsbt({
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
      covenantPubkey: Buffer.from(this.#covenantPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedUnstakingPsbtNoFee(
    signedStakingTransactionHex: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getUnstakingPsbt({
      preUtxoHex: signedStakingTransactionHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      covenantPubkey: Buffer.from(this.#covenantPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedUnstakingPsbt(
    signedStakingTransactionHex: string,
    noFeePsbtHex: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const tx = bitcoin.Psbt.fromHex(noFeePsbtHex).extractTransaction().toHex();
    const fee = await estimateFee(tx, this.#feeRate);
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getUnstakingPsbt({
      preUtxoHex: signedStakingTransactionHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      covenantPubkey: Buffer.from(this.#covenantPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      fee,
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedSlashingPsbtNoFee(
    signedStakingPsbtHex: string,
    burnAddress: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getSlashingPsbt({
      preUtxoHex: signedStakingPsbtHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      covenantPubkey: Buffer.from(this.#covenantPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      burnAddress: burnAddress,
    });
    return { psbt, toSignInputs };
  }

  async getUnsignedSlashingPsbt(
    signedStakingPsbtHex: string,
    burnAddress: string,
    noFeePsbtHex: string
  ): Promise<{ psbt: bitcoin.Psbt; toSignInputs: ToSignInput[] }> {
    const tx = bitcoin.Psbt.fromHex(noFeePsbtHex).extractTransaction().toHex();
    const fee = await estimateFee(tx, this.#feeRate);
    const staker = await this.getStaker();
    const { psbt, toSignInputs } = await staker.getSlashingPsbt({
      preUtxoHex: signedStakingPsbtHex,
      stakerPubKey: Buffer.from(this.#stakerPubkey, "hex"),
      covenantPubkey: Buffer.from(this.#covenantPubkey, "hex"),
      protocolPubkey: Buffer.from(this.#protocolPubkey, "hex"),
      burnAddress: burnAddress,
      fee,
    });
    return { psbt, toSignInputs };
  }

  setCovenantPubkey(covenantPubkey: string): void {
    this.#covenantPubkey = covenantPubkey;
  }
  setProtocolPubkey(protocolPubkey: string): void {
    this.#protocolPubkey = protocolPubkey;
  }
  setTimeLock(timeLock: number): void {
    this.#timeLock = timeLock;
  }
  setFeeRate(feeRate: number): void {
    this.#feeRate = feeRate;
  }
  async getProtocolPubkey(): Promise<string> {
    return this.#protocolPubkey;
  }
  async getTimeLock(): Promise<number> {
    return this.#timeLock;
  }
  async getFeeRate(): Promise<number> {
    return this.#feeRate;
  }
  async getStaker(): Promise<unsignedTransaction.StakingTransaction> {
    return new unsignedTransaction.StakingTransaction(
      this.#networkType,
      this.#stakerAddress,
      this.#feeRate,
      this.#timeLock
    );
  }
}
