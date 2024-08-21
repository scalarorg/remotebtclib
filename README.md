# remotebtclib

Create vault transaction:

```typescript
import * as bitcoin from "bitcoinjs-lib";
import * as vault from "vault"
const staker = new vault.Staker(
  stakerAddress,
  stakerPublicKey,
  servicePublicKey,
  covenantPublicKeys,
  quorum,
  tag,
  version,
  chainID,
  chainIdUserAddress,
  chainSmartContractAddress,
  mintingAmount
);
const regularUTXOs: vault.UTXO[] = await vault.getUTXOs(stakerAddress); // Mempool call api
const stakingAmount = ?; // in statoshis
const feeRate = ?;
const rbf = true/false;
const { psbt: unsignedVaultPsbt, feeEstimate: fee } =
  await staker.getUnsignedVaultPsbt(regularUTXOs, stakingAmount, feeRate, rbf);
```
---
Create unbonding transaction, have 3 types: \
    - With dApp \
    - Slash or Lost key (SoL) \
    - With scalar's custodials (BWoD)
```Typescript
const unStaker = new UnStaker(
    stakerAddress,
    hexTx,
    covs,
    qorum
);
//////////////////////////// dApp ////////////////////////////
const {
    psbt: burningPsbt,
    feeEstimate: fee,
    burningLeaf,
} = await unStaker.getUnsignedBurningPsbt(receiveAddress, feeRate, rbf);
//////////////////////////// SoL ////////////////////////////
const {
    psbt: slashingOrLostKeyPsbt,
    feeEstimate: fee,
    SolLeaf,
} = await unStaker.getUnsignedSlashingOrLostKeyPsbt(receiveAddress, feeRate, rbf);
//////////////////////////// BWoD ////////////////////////////
const {
    psbt: burnWithoutDAppPsbt,
    feeEstimate: fee,
    BWoD,
} = await unStaker.getUnsignedBurnWithoutDAppPsbt(receiveAddress, feeRate, rbf);
```

