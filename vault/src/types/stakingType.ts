export interface VaultScript {
  burningScript: Buffer;
  slashingOrLostKeyScript: Buffer;
  burnWithoutDAppScript: Buffer;
  stakingDataScript: Buffer;
  mintingDataScript: Buffer;
}
