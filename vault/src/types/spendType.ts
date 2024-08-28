export interface Leaf {
  leafVersion: number;
  script: Buffer;
  controlBlock: Buffer;
}
export interface SpendingLeaves {
  burningLeaf: Leaf;
  slashingOrLostKeyLeaf: Leaf;
  burnWithoutDAppLeaf: Leaf;
}

export interface EmbeddedDataScript {
  stakingDataScript: Buffer;
  mintingDataScript: Buffer;
}
