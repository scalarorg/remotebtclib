export interface StakingScript{
    timeLockScript: Buffer;
    unBondingScript: Buffer;
    slashingScript: Buffer;
}