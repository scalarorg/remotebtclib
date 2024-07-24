/// <reference types="node" />
import { UnspentOutput } from "@unisat/wallet-sdk";
import { ToSignInput } from "@unisat/wallet-sdk";
import * as bitcoin from "bitcoinjs-lib";
import { SpendingLeaves } from "../type/spendType";
export declare function getTaprootAddress(stakerPubKey: Buffer, covenantPubkey: Buffer, protocolPubkey: Buffer, timeLock: number, networkType: bitcoin.Network): Promise<bitcoin.payments.Payment>;
export declare function getTapLeafScript(stakerPubKey: Buffer, covenantPubkey: Buffer, protocolPubkey: Buffer, timeLock: number, networkType: bitcoin.Network): Promise<SpendingLeaves>;
export declare class StakingTransaction {
    #private;
    constructor(networkType: bitcoin.Network, changeAddress: string, feeRate: number, timeLock: number, enableRBF?: boolean);
    getStakingPsbt({ btcUtxos, amount, stakerPubKey, covenantPubkey, protocolPubkey, }: {
        btcUtxos: UnspentOutput[];
        amount: number;
        stakerPubKey: Buffer;
        covenantPubkey: Buffer;
        protocolPubkey: Buffer;
    }): Promise<{
        psbt: import("bitcoinjs-lib").Psbt;
        toSignInputs: ToSignInput[];
    }>;
    getUnstakingPsbt({ preUtxoHex, stakerPubKey, covenantPubkey, protocolPubkey, fee, }: {
        preUtxoHex: string;
        stakerPubKey: Buffer;
        covenantPubkey: Buffer;
        protocolPubkey: Buffer;
        fee?: number;
    }): Promise<{
        psbt: import("bitcoinjs-lib").Psbt;
        toSignInputs: ToSignInput[];
    }>;
    getSlashingPsbt({ preUtxoHex, stakerPubKey, covenantPubkey, protocolPubkey, burnAddress, // partial or full ?
    fee, }: {
        preUtxoHex: string;
        stakerPubKey: Buffer;
        covenantPubkey: Buffer;
        protocolPubkey: Buffer;
        burnAddress: string;
        fee?: number;
    }): Promise<{
        psbt: import("bitcoinjs-lib").Psbt;
        toSignInputs: ToSignInput[];
    }>;
    getScriptP2TR(stakerPubKey: Buffer, covenantPubkey: Buffer, protocolPubkey: Buffer): Promise<bitcoin.payments.Payment>;
    getTapLeavesScript(stakerPubKey: Buffer, covenantPubkey: Buffer, protocolPubkey: Buffer): Promise<SpendingLeaves>;
}
