/// <reference types="node" />
export interface StakingScript {
    timeLockScript: Buffer;
    unBondingScript: Buffer;
    slashingScript: Buffer;
}
