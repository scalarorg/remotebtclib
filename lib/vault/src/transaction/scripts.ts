import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "@unisat/wallet-sdk/lib/utils";
import { VaultScript } from "../type/stakingType";
import { LEAF_VERSION_TAPSCRIPT, NUMS } from "../bip/bip341";
import { Leaf, SpendingLeaves } from "../type/spendType";

export class StakerScript {
  #stakerPubKey: Buffer;
  #protocolPubkey: Buffer;
  #covenantPubkey: Buffer[];
  #qorum: number;

  constructor(
    stakerPubkey: Buffer,
    protocolPubkey: Buffer,
    covenantPubkey: Buffer[],
    qorum: number
  ) {
    this.#stakerPubKey = stakerPubkey;
    this.#protocolPubkey = protocolPubkey;
    this.#covenantPubkey = covenantPubkey;
    this.#qorum = qorum;
  }
  burningScript(): Buffer{
    // const delay_time = 0x00400001; // 512 seconds
    const burningScriptASM = [
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
      toXOnly(this.#protocolPubkey),
      bitcoin.opcodes.OP_CHECKSIG,
    ];
    return bitcoin.script.compile(burningScriptASM);
  }
  slashingOrLostKeyScript(): Buffer{
    const slashingOrLostKeyScriptASM = [
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
      toXOnly(this.#protocolPubkey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
    ];
    for (let i = 0 ; i < this.#covenantPubkey.length; i++) {
      slashingOrLostKeyScriptASM.push(toXOnly(this.#covenantPubkey[i]));
      if (i == 0){
        slashingOrLostKeyScriptASM.push(bitcoin.opcodes.OP_CHECKSIG);
      }
      else {
        slashingOrLostKeyScriptASM.push(bitcoin.opcodes.OP_CHECKSIGADD);
      }
    }
    slashingOrLostKeyScriptASM.push(bitcoin.script.number.encode(this.#qorum));
    slashingOrLostKeyScriptASM.push(bitcoin.opcodes.OP_GREATERTHANOREQUAL);
    return bitcoin.script.compile(slashingOrLostKeyScriptASM);
  }
  burnWithoutDAppScript(): Buffer{
    const burnWithoutDAppScriptASM = [
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
    ];
    for (let i = 0 ; i < this.#covenantPubkey.length; i++) {
      burnWithoutDAppScriptASM.push(toXOnly(this.#covenantPubkey[i]));
      if (i == 0){
        burnWithoutDAppScriptASM.push(bitcoin.opcodes.OP_CHECKSIG);
      }
      else {
        burnWithoutDAppScriptASM.push(bitcoin.opcodes.OP_CHECKSIGADD);
      }
    }
    burnWithoutDAppScriptASM.push(bitcoin.script.number.encode(this.#qorum));
    burnWithoutDAppScriptASM.push(bitcoin.opcodes.OP_GREATERTHANOREQUAL);
    return bitcoin.script.compile(burnWithoutDAppScriptASM);
  }

  buildingScript(): VaultScript {
    return {
      burningScript: this.burningScript(),
      slashingOrLostKeyScript: this.slashingOrLostKeyScript(),
      burnWithoutDAppScript: this.burnWithoutDAppScript(),
    };
  }
}

export class SpendScript {
  #burningScript: Buffer;
  #slashingOrLostKeyScript: Buffer;
  #burnWithoutDAppScript: Buffer;
  #tapTree: any;
  #networkType: bitcoin.Network;
  constructor(
    burningScript: Buffer,
    slashingOrLostKeyScript: Buffer,
    burnWithoutDAppScript: Buffer,
    tapTree: any,
    networkType: bitcoin.Network
  ) {
    this.#burningScript = burningScript;
    this.#slashingOrLostKeyScript = slashingOrLostKeyScript;
    this.#burnWithoutDAppScript = burnWithoutDAppScript;
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
      burningLeaf: this.buildingLeaf(this.#burningScript),
      slashingOrLostKeyLeaf: this.buildingLeaf(this.#slashingOrLostKeyScript),
      burnWithoutDAppLeaf: this.buildingLeaf(this.#burnWithoutDAppScript),
    };
  }
}
