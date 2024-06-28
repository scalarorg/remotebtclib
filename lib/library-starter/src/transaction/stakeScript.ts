import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "@unisat/wallet-sdk/lib/utils";
import { StakingScript } from "../type/stakingType";

export class StakerScript {
  #stakerPubKey: Buffer;
  #covenantPubkey: Buffer;
  #finalityProviderPubkey: Buffer;
  #timeLock: number;
  #minimumThreshold: number;

  constructor(
    stakerPubkey: Buffer,
    covenantPubkey: Buffer,
    finalityProviderPubkey: Buffer,
    timeLock: number
  ) {
    this.#stakerPubKey = stakerPubkey;
    this.#covenantPubkey = covenantPubkey;
    this.#finalityProviderPubkey = finalityProviderPubkey;
    this.#timeLock = timeLock;
    this.#minimumThreshold = 2;
  }
  timeLockScript() {
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
  unBondingScript() {
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
  slashingScript() {
    return bitcoin.script.compile([this.#stakerPubKey]);
  }

  buildingScript(): StakingScript {
    return {
      timeLockScript: this.timeLockScript(),
      unBondingScript: this.unBondingScript(),
      slashingScript: this.slashingScript(),
    };
  }
}
