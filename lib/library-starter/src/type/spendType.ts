export interface Leaf {
  leafVersion: number;
  script: Buffer;
  controlBlock: Buffer;
}
export interface SpendingLeaves {
  timeLockLeaf: Leaf;
  unBondingLeaf: Leaf;
  slashingLeaf: Leaf;
}
