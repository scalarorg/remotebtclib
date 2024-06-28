import { LEAF_VERSION_TAPSCRIPT } from "../taproot/BIP341";
import * as bitcoin from "bitcoinjs-lib";
import { NUMS } from "../taproot/BIP341";
import { toXOnly } from "@unisat/wallet-sdk/lib/utils";
import { SpendingLeaves } from "../type/spendType";

export class SpendScript {
  #timeLockScript: Buffer;
  #unBondingScript: Buffer;
  #slashingScript: Buffer;
  #tapTree: any;
  #networkType: bitcoin.Network;
  constructor(
    timeLockScript: Buffer,
    unBondingScript: Buffer,
    slashingScript: Buffer,
    tapTree: any,
    networkType: bitcoin.Network
  ) {
    this.#timeLockScript = timeLockScript;
    this.#unBondingScript = unBondingScript;
    this.#slashingScript = slashingScript;
    this.#tapTree = tapTree;
    this.#networkType = networkType;
  }
  buildingLeaf(script: Buffer) {
    const redeem = {
      output: script,
      redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };
    const custom_tapLeaf = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(Buffer.from(NUMS, "hex")),
      scriptTree: this.#tapTree,
      redeem: redeem,
      network: this.#networkType,
    });
    const tapLeafScript = {
      leafVersion: redeem.redeemVersion,
      script: redeem.output,
      // why last witness:
      // + Script Execution
      // + Leaf Script Validation
      controlBlock:
        custom_tapLeaf.witness![
          custom_tapLeaf.witness!.length - 1
        ],
    };
    return tapLeafScript;
  }
  bulidingLeaves(): SpendingLeaves {
    return {
      timeLockLeaf: this.buildingLeaf(this.#timeLockScript),
      unBondingLeaf: this.buildingLeaf(this.#unBondingScript),
      slashingLeaf: this.buildingLeaf(this.#slashingScript),
    };
  }
}
