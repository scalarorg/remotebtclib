"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StakerScript_stakerPubKey, _StakerScript_covenantPubkey, _StakerScript_protocolPubkey, _StakerScript_timeLock, _StakerScript_minimumThreshold, _SpendScript_timeLockScript, _SpendScript_unBondingScript, _SpendScript_slashingScript, _SpendScript_tapTree, _SpendScript_networkType;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpendScript = exports.StakerScript = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const utils_1 = require("@unisat/wallet-sdk/lib/utils");
const bip341_1 = require("../bip/bip341");
class StakerScript {
    constructor(stakerPubkey, covenantPubkey, protocolPubkey, timeLock) {
        _StakerScript_stakerPubKey.set(this, void 0);
        _StakerScript_covenantPubkey.set(this, void 0);
        _StakerScript_protocolPubkey.set(this, void 0);
        _StakerScript_timeLock.set(this, void 0);
        _StakerScript_minimumThreshold.set(this, void 0);
        __classPrivateFieldSet(this, _StakerScript_stakerPubKey, stakerPubkey, "f");
        __classPrivateFieldSet(this, _StakerScript_covenantPubkey, covenantPubkey, "f");
        __classPrivateFieldSet(this, _StakerScript_protocolPubkey, protocolPubkey, "f");
        __classPrivateFieldSet(this, _StakerScript_timeLock, timeLock, "f");
        __classPrivateFieldSet(this, _StakerScript_minimumThreshold, 2, "f");
    }
    timeLockScript() {
        // const delay_time = 0x00400001; // 512 seconds
        const lockTimeScriptASM = [
            bitcoin.script.number.encode(__classPrivateFieldGet(this, _StakerScript_timeLock, "f")),
            bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
            bitcoin.opcodes.OP_DROP,
            (0, utils_1.toXOnly)(__classPrivateFieldGet(this, _StakerScript_stakerPubKey, "f")),
            bitcoin.opcodes.OP_CHECKSIG,
        ];
        return bitcoin.script.compile(lockTimeScriptASM);
    }
    unBondingScript() {
        const unBondingScriptASM = [
            (0, utils_1.toXOnly)(__classPrivateFieldGet(this, _StakerScript_stakerPubKey, "f")),
            bitcoin.opcodes.OP_CHECKSIG,
            (0, utils_1.toXOnly)(__classPrivateFieldGet(this, _StakerScript_covenantPubkey, "f")),
            bitcoin.opcodes.OP_CHECKSIGADD,
            bitcoin.script.number.encode(__classPrivateFieldGet(this, _StakerScript_minimumThreshold, "f")),
            bitcoin.opcodes.OP_NUMEQUAL,
        ];
        return bitcoin.script.compile(unBondingScriptASM);
    }
    slashingScript() {
        const slashingScriptASM = [
            (0, utils_1.toXOnly)(__classPrivateFieldGet(this, _StakerScript_covenantPubkey, "f")),
            bitcoin.opcodes.OP_CHECKSIG,
            (0, utils_1.toXOnly)(__classPrivateFieldGet(this, _StakerScript_protocolPubkey, "f")),
            bitcoin.opcodes.OP_CHECKSIGADD,
            bitcoin.script.number.encode(__classPrivateFieldGet(this, _StakerScript_minimumThreshold, "f")),
            bitcoin.opcodes.OP_NUMEQUAL,
        ];
        return bitcoin.script.compile(slashingScriptASM);
    }
    buildingScript() {
        return {
            timeLockScript: this.timeLockScript(),
            unBondingScript: this.unBondingScript(),
            slashingScript: this.slashingScript(),
        };
    }
}
exports.StakerScript = StakerScript;
_StakerScript_stakerPubKey = new WeakMap(), _StakerScript_covenantPubkey = new WeakMap(), _StakerScript_protocolPubkey = new WeakMap(), _StakerScript_timeLock = new WeakMap(), _StakerScript_minimumThreshold = new WeakMap();
class SpendScript {
    constructor(timeLockScript, unBondingScript, slashingScript, tapTree, networkType) {
        _SpendScript_timeLockScript.set(this, void 0);
        _SpendScript_unBondingScript.set(this, void 0);
        _SpendScript_slashingScript.set(this, void 0);
        _SpendScript_tapTree.set(this, void 0);
        _SpendScript_networkType.set(this, void 0);
        __classPrivateFieldSet(this, _SpendScript_timeLockScript, timeLockScript, "f");
        __classPrivateFieldSet(this, _SpendScript_unBondingScript, unBondingScript, "f");
        __classPrivateFieldSet(this, _SpendScript_slashingScript, slashingScript, "f");
        __classPrivateFieldSet(this, _SpendScript_tapTree, tapTree, "f");
        __classPrivateFieldSet(this, _SpendScript_networkType, networkType, "f");
    }
    buildingLeaf(script) {
        const redeem = {
            output: script,
            redeemVersion: bip341_1.LEAF_VERSION_TAPSCRIPT,
        };
        const custom_tapLeaf = bitcoin.payments.p2tr({
            internalPubkey: (0, utils_1.toXOnly)(Buffer.from(bip341_1.NUMS, "hex")),
            scriptTree: __classPrivateFieldGet(this, _SpendScript_tapTree, "f"),
            redeem: redeem,
            network: __classPrivateFieldGet(this, _SpendScript_networkType, "f"),
        });
        const tapLeafScript = {
            leafVersion: redeem.redeemVersion,
            script: redeem.output,
            // why last witness:
            // + Script Execution
            // + Leaf Script Validation
            controlBlock: custom_tapLeaf.witness[custom_tapLeaf.witness.length - 1],
        };
        return tapLeafScript;
    }
    bulidingLeaves() {
        return {
            timeLockLeaf: this.buildingLeaf(__classPrivateFieldGet(this, _SpendScript_timeLockScript, "f")),
            unBondingLeaf: this.buildingLeaf(__classPrivateFieldGet(this, _SpendScript_unBondingScript, "f")),
            slashingLeaf: this.buildingLeaf(__classPrivateFieldGet(this, _SpendScript_slashingScript, "f")),
        };
    }
}
exports.SpendScript = SpendScript;
_SpendScript_timeLockScript = new WeakMap(), _SpendScript_unBondingScript = new WeakMap(), _SpendScript_slashingScript = new WeakMap(), _SpendScript_tapTree = new WeakMap(), _SpendScript_networkType = new WeakMap();
