import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";

import { LEAF_VERSION_TAPSCRIPT, NUMS } from "../bip/bip341";
import { EmbeddedDataScript, Leaf, SpendingLeaves } from "../types/spendType";
import { VaultScript } from "../types/stakingType";

export class StakerScript {
  #stakerPubKey: Buffer;
  #protocolPubkey: Buffer;
  #covenantPubkey: Buffer[];
  #qorum: number;
  #tag: Buffer;
  #version: Buffer;
  #chainID: Buffer;
  #chainIdUserAddress: Buffer;
  #chainSmartContractAddress: Buffer;
  #mintingAmount: Buffer;

  constructor(
    stakerPubkey: Buffer,
    protocolPubkey: Buffer,
    covenantPubkey: Buffer[],
    qorum: number,
    tag: Buffer,
    version: Buffer,
    chainID: Buffer,
    chainIdUserAddress: Buffer,
    chainSmartContractAddress: Buffer,
    mintingAmount: Buffer,
  ) {
    this.#stakerPubKey = stakerPubkey;
    this.#protocolPubkey = protocolPubkey;
    this.#covenantPubkey = covenantPubkey;
    this.#qorum = qorum;
    this.#tag = tag;
    this.#version = version;
    this.#chainID = chainID;
    this.#chainIdUserAddress = chainIdUserAddress;
    this.#chainSmartContractAddress = chainSmartContractAddress;
    this.#mintingAmount = mintingAmount;
  }
  burningScript(): Buffer {
    const burningScriptASM = [
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
      toXOnly(this.#protocolPubkey),
      bitcoin.opcodes.OP_CHECKSIG,
    ];
    return bitcoin.script.compile(burningScriptASM);
  }
  slashingOrLostKeyScript(): Buffer {
    const slashingOrLostKeyScriptASM = [
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
      toXOnly(this.#protocolPubkey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
    ];

    // keys must be sorted
    const sortedPks = this.#covenantPubkey.sort((a, b) =>
      Buffer.compare(toXOnly(a), toXOnly(b)),
    );
    // verify there are no duplicates
    for (let i = 0; i < sortedPks.length - 1; ++i) {
      if (sortedPks[i].equals(sortedPks[i + 1])) {
        throw new Error("Duplicate keys provided");
      }
    }

    for (let i = 0; i < this.#covenantPubkey.length; i++) {
      slashingOrLostKeyScriptASM.push(toXOnly(this.#covenantPubkey[i]));
      if (i == 0) {
        slashingOrLostKeyScriptASM.push(bitcoin.opcodes.OP_CHECKSIG);
      } else {
        slashingOrLostKeyScriptASM.push(bitcoin.opcodes.OP_CHECKSIGADD);
      }
    }
    slashingOrLostKeyScriptASM.push(bitcoin.script.number.encode(this.#qorum));
    slashingOrLostKeyScriptASM.push(bitcoin.opcodes.OP_GREATERTHANOREQUAL);
    return bitcoin.script.compile(slashingOrLostKeyScriptASM);
  }
  burnWithoutDAppScript(): Buffer {
    const burnWithoutDAppScriptASM = [
      toXOnly(this.#stakerPubKey),
      bitcoin.opcodes.OP_CHECKSIGVERIFY,
    ];

    // keys must be sorted
    const sortedPks = this.#covenantPubkey.sort((a, b) =>
      Buffer.compare(toXOnly(a), toXOnly(b)),
    );
    // verify there are no duplicates
    for (let i = 0; i < sortedPks.length - 1; ++i) {
      if (sortedPks[i].equals(sortedPks[i + 1])) {
        throw new Error("Duplicate keys provided");
      }
    }

    for (let i = 0; i < this.#covenantPubkey.length; i++) {
      burnWithoutDAppScriptASM.push(toXOnly(this.#covenantPubkey[i]));
      if (i == 0) {
        burnWithoutDAppScriptASM.push(bitcoin.opcodes.OP_CHECKSIG);
      } else {
        burnWithoutDAppScriptASM.push(bitcoin.opcodes.OP_CHECKSIGADD);
      }
    }
    burnWithoutDAppScriptASM.push(bitcoin.script.number.encode(this.#qorum));
    burnWithoutDAppScriptASM.push(bitcoin.opcodes.OP_GREATERTHANOREQUAL);
    return bitcoin.script.compile(burnWithoutDAppScriptASM);
  }

  stakingDataScript(): Buffer {
    const data_staking = Buffer.concat([
      this.#tag,
      this.#version,
      toXOnly(this.#stakerPubKey),
      toXOnly(this.#protocolPubkey),
    ]);
    const embedded_staking_data = [bitcoin.opcodes.OP_RETURN, data_staking];
    const staking_script = bitcoin.script.compile(embedded_staking_data);
    return staking_script;
  }

  mintingDataScript(): Buffer {
    const data_minting = Buffer.concat([
      this.#chainID,
      this.#chainIdUserAddress,
      this.#chainSmartContractAddress,
      this.#mintingAmount,
    ]);
    const embedded_minting_data = [bitcoin.opcodes.OP_RETURN, data_minting];
    const minting_script = bitcoin.script.compile(embedded_minting_data);
    return minting_script;
  }

  buildingScript(): VaultScript {
    return {
      burningScript: this.burningScript(),
      slashingOrLostKeyScript: this.slashingOrLostKeyScript(),
      burnWithoutDAppScript: this.burnWithoutDAppScript(),
      stakingDataScript: this.stakingDataScript(),
      mintingDataScript: this.mintingDataScript(),
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
    networkType: bitcoin.Network,
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
      controlBlock: custom_tapLeaf.witness![custom_tapLeaf.witness!.length - 1],
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

export class EmbeddedScript {
  #stakingDataScript: Buffer;
  #mintingDataScript: Buffer;
  #networkType: bitcoin.Network;
  constructor(
    stakingDataScript: Buffer,
    mintingDataScript: Buffer,
    networkType: bitcoin.Network,
  ) {
    this.#stakingDataScript = stakingDataScript;
    this.#mintingDataScript = mintingDataScript;
    this.#networkType = networkType;
  }
  buildEmbeddedScript(): EmbeddedDataScript {
    const script_embeded = bitcoin.payments.embed({
      data: [this.#stakingDataScript, this.#mintingDataScript],
      network: this.#networkType,
    });

    // Ensure that data is defined and has at least 2 elements
    const [stakingData, mintingData] = script_embeded?.data ?? [
      Buffer.alloc(0),
      Buffer.alloc(0),
    ];

    // Ensure that both elements must have data
    if (!stakingData || !mintingData) {
      throw new Error("Embedded data is not valid");
    }

    // Ensure that both elements are of type Buffer
    return { stakingDataScript: stakingData, mintingDataScript: mintingData };
  }
}
