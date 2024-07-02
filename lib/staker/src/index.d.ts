import { ToSignInput } from "@unisat/wallet-sdk";
import * as bitcoin from "bitcoinjs-lib";
import * as unsignedTransaction from "./transaction/unsignedPsbt";
export * as unsignedTransaction from "./transaction/unsignedPsbt";
export declare class UNISATStaker {
    #private;
    constructor(stakerAddress: string, stakerPubkey: string, covenantPubkey: string, protocolPubkey: string, networkType: bitcoin.Network, timeLock: number, feeRate: number);
    getUnsignedStakingPsbt(btcUtxos: any, toAmount: number): Promise<{
        psbt: bitcoin.Psbt;
        toSignInputs: ToSignInput[];
    }>;
    getUnsignedUnstakingPsbtNoFee(signedStakingTransactionHex: string): Promise<{
        psbt: bitcoin.Psbt;
        toSignInputs: ToSignInput[];
    }>;
    getUnsignedUnstakingPsbt(signedStakingTransactionHex: string, noFeePsbtHex: string): Promise<{
        psbt: bitcoin.Psbt;
        toSignInputs: ToSignInput[];
    }>;
    getUnsignedSlashingPsbtNoFee(signedStakingPsbtHex: string, burnAddress: string): Promise<{
        psbt: bitcoin.Psbt;
        toSignInputs: ToSignInput[];
    }>;
    getUnsignedSlashingPsbt(signedStakingPsbtHex: string, burnAddress: string, noFeePsbtHex: string): Promise<{
        psbt: bitcoin.Psbt;
        toSignInputs: ToSignInput[];
    }>;
    setCovenantPubkey(covenantPubkey: string): void;
    setProtocolPubkey(protocolPubkey: string): void;
    setTimeLock(timeLock: number): void;
    setFeeRate(feeRate: number): void;
    getProtocolPubkey(): Promise<string>;
    getTimeLock(): Promise<number>;
    getFeeRate(): Promise<number>;
    getStaker(): Promise<unsignedTransaction.StakingTransaction>;
}
