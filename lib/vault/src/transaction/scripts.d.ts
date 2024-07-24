/// <reference types="node" />
import * as bitcoin from "bitcoinjs-lib";
import { StakingScript } from "../type/stakingType";
import { Leaf, SpendingLeaves } from "../type/spendType";
export declare class StakerScript {
    #private;
    constructor(stakerPubkey: Buffer, covenantPubkey: Buffer, protocolPubkey: Buffer, timeLock: number);
    timeLockScript(): Buffer;
    unBondingScript(): Buffer;
    slashingScript(): Buffer;
    buildingScript(): StakingScript;
}
export declare class SpendScript {
    #private;
    constructor(timeLockScript: Buffer, unBondingScript: Buffer, slashingScript: Buffer, tapTree: any, networkType: bitcoin.Network);
    buildingLeaf(script: Buffer): Leaf;
    bulidingLeaves(): SpendingLeaves;
}
