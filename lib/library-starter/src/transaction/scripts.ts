import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "@unisat/wallet-sdk/lib/utils";
import { StakingScript } from "../type/stakingType";
import { LEAF_VERSION_TAPSCRIPT, NUMS } from "../bip/bip341";
import { Leaf, SpendingLeaves } from "../type/spendType";

export class StakerScript {
  #stakerPubKey: Buffer;
  #covenantPubkey: Buffer;
  #protocolPubkey: Buffer;
  #timeLock: number;
  #minimumThreshold: number;

  constructor(
    stakerPubkey: Buffer,
    covenantPubkey: Buffer,
    protocolPubkey: Buffer,
    timeLock: number
  ) {
    this.#stakerPubKey = stakerPubkey;
    this.#covenantPubkey = covenantPubkey;
    this.#protocolPubkey = protocolPubkey;
    this.#timeLock = timeLock;
    this.#minimumThreshold = 2;
  }
  timeLockScript(): Buffer{
    // const delay_time = 0x00400001; // 512 seconds
    const lockTimeScriptASM = [
      bitcoin.script.number.encode(this.#timeLock),
      bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
      bitcoin.opcodes.OP_DROP,
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIG,
    ];
    return bitcoin.script.compile(lockTimeScriptASM);
  }
  unBondingScript(): Buffer{
    const unBondingScriptASM = [
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIG,
      toXOnly(this.#covenantPubkey),
      bitcoin.opcodes.OP_CHECKSIGADD,
      bitcoin.script.number.encode(this.#minimumThreshold),
      bitcoin.opcodes.OP_NUMEQUAL,
    ];
    return bitcoin.script.compile(unBondingScriptASM);
  }
  slashingScript(): Buffer{
    const slashingScriptASM = [
      toXOnly(this.#covenantPubkey),
      bitcoin.opcodes.OP_CHECKSIG,
      toXOnly(this.#protocolPubkey),
      bitcoin.opcodes.OP_CHECKSIGADD,
      bitcoin.script.number.encode(this.#minimumThreshold),
      bitcoin.opcodes.OP_NUMEQUAL,
    ];
    return bitcoin.script.compile(slashingScriptASM);
  }

  buildingScript(): StakingScript {
    return {
      timeLockScript: this.timeLockScript(),
      unBondingScript: this.unBondingScript(),
      slashingScript: this.slashingScript(),
    };
  }
}

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
  buildingLeaf(script: Buffer): Leaf {
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
