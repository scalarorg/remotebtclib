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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
var _StakingTransaction_networkType, _StakingTransaction_changeAddress, _StakingTransaction_feeRate, _StakingTransaction_timeLock, _StakingTransaction_enableRBF;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingTransaction = exports.getTapLeafScript = exports.getTaprootAddress = void 0;
const network_1 = require("@unisat/wallet-sdk/lib/network");
const tx_helpers_1 = require("@unisat/wallet-sdk/lib/tx-helpers");
const scripts = __importStar(require("./scripts"));
const bip341_1 = require("../bip/bip341");
const utils_1 = require("@unisat/wallet-sdk/lib/utils");
const bitcoin = __importStar(require("bitcoinjs-lib"));
function getTaprootAddress(stakerPubKey, covenantPubkey, protocolPubkey, timeLock, networkType // use bitcoinjs-lib network
) {
    return __awaiter(this, void 0, void 0, function* () {
        const tapLeaves = new scripts.StakerScript(stakerPubKey, covenantPubkey, protocolPubkey, timeLock).buildingScript();
        const tapTree = [
            {
                output: tapLeaves.timeLockScript,
            },
            [
                {
                    output: tapLeaves.unBondingScript,
                },
                {
                    output: tapLeaves.slashingScript,
                },
            ],
        ];
        // Gen taproot address
        const script_p2tr = bitcoin.payments.p2tr({
            internalPubkey: (0, utils_1.toXOnly)(Buffer.from(bip341_1.NUMS, "hex")),
            scriptTree: tapTree,
            network: networkType,
        });
        return script_p2tr;
    });
}
exports.getTaprootAddress = getTaprootAddress;
function getTapLeafScript(stakerPubKey, covenantPubkey, protocolPubkey, timeLock, networkType) {
    return __awaiter(this, void 0, void 0, function* () {
        const tapLeaves = new scripts.StakerScript(stakerPubKey, covenantPubkey, protocolPubkey, timeLock).buildingScript();
        const tapTree = [
            {
                output: tapLeaves.timeLockScript,
            },
            [
                {
                    output: tapLeaves.unBondingScript,
                },
                {
                    output: tapLeaves.slashingScript,
                },
            ],
        ];
        const tapScripts = new scripts.SpendScript(tapLeaves.timeLockScript, tapLeaves.unBondingScript, tapLeaves.slashingScript, tapTree, networkType).bulidingLeaves();
        return tapScripts;
    });
}
exports.getTapLeafScript = getTapLeafScript;
class StakingTransaction {
    constructor(networkType, changeAddress, feeRate, timeLock, enableRBF = true) {
        _StakingTransaction_networkType.set(this, void 0);
        _StakingTransaction_changeAddress.set(this, void 0); // staker address
        _StakingTransaction_feeRate.set(this, void 0);
        _StakingTransaction_timeLock.set(this, void 0);
        _StakingTransaction_enableRBF.set(this, void 0);
        __classPrivateFieldSet(this, _StakingTransaction_networkType, networkType, "f");
        __classPrivateFieldSet(this, _StakingTransaction_changeAddress, changeAddress, "f");
        __classPrivateFieldSet(this, _StakingTransaction_feeRate, feeRate, "f");
        __classPrivateFieldSet(this, _StakingTransaction_timeLock, timeLock, "f");
        __classPrivateFieldSet(this, _StakingTransaction_enableRBF, enableRBF, "f");
    }
    // Get input base on @unisat - Staking Transaction: unbonding + slashing
    // Unbonding Transaction: allow output to be spent after a certain time - called UnStaking Transaction
    // Slashing Transaction: allow staker the staker to burn the fund - called Slashing Transaction
    getStakingPsbt({ btcUtxos, amount, stakerPubKey, covenantPubkey, protocolPubkey, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const script_p2tr = yield this.getScriptP2TR(stakerPubKey, covenantPubkey, protocolPubkey);
            const tos = [
                {
                    address: script_p2tr.address,
                    satoshis: amount,
                },
            ];
            // unisat - sendBTC
            let network;
            if (__classPrivateFieldGet(this, _StakingTransaction_networkType, "f") === bitcoin.networks.testnet) {
                network = network_1.NetworkType.TESTNET;
            }
            else if (__classPrivateFieldGet(this, _StakingTransaction_networkType, "f") === bitcoin.networks.regtest) {
                network = network_1.NetworkType.REGTEST;
            }
            else {
                network = network_1.NetworkType.MAINNET;
            }
            const { psbt, toSignInputs } = yield (0, tx_helpers_1.sendBTC)({
                btcUtxos,
                tos,
                networkType: network,
                changeAddress: __classPrivateFieldGet(this, _StakingTransaction_changeAddress, "f"),
                feeRate: __classPrivateFieldGet(this, _StakingTransaction_feeRate, "f"),
                enableRBF: __classPrivateFieldGet(this, _StakingTransaction_enableRBF, "f"),
            });
            return { psbt, toSignInputs };
        });
    }
    getUnstakingPsbt({ preUtxoHex, stakerPubKey, covenantPubkey, protocolPubkey, fee = 0, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const txb = new bitcoin.Psbt({ network: __classPrivateFieldGet(this, _StakingTransaction_networkType, "f") });
            // Default setting
            txb.setVersion(2);
            txb.setLocktime(0);
            const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
            const tapLeavesScript = yield this.getTapLeavesScript(stakerPubKey, covenantPubkey, protocolPubkey);
            txb.addInputs([
                {
                    hash: preUTXO.getId(),
                    index: 0,
                    witnessUtxo: {
                        script: preUTXO.outs[0].script,
                        value: preUTXO.outs[0].value,
                    },
                    tapLeafScript: [tapLeavesScript.timeLockLeaf],
                    sequence: __classPrivateFieldGet(this, _StakingTransaction_timeLock, "f"), // big endian
                },
            ]);
            txb.addOutputs([
                {
                    address: __classPrivateFieldGet(this, _StakingTransaction_changeAddress, "f"),
                    value: preUTXO.outs[0].value - fee, // Amount in satoshis
                },
            ]);
            return {
                psbt: txb,
                toSignInputs: [
                    {
                        index: 0,
                        publicKey: stakerPubKey.toString("hex"),
                        disableTweakSigner: true,
                    },
                ],
            };
        });
    }
    getSlashingPsbt({ preUtxoHex, stakerPubKey, covenantPubkey, protocolPubkey, burnAddress, // partial or full ?
    fee = 0, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const txb = new bitcoin.Psbt({ network: __classPrivateFieldGet(this, _StakingTransaction_networkType, "f") });
            // Default setting
            txb.setVersion(2);
            txb.setLocktime(0);
            const preUTXO = bitcoin.Transaction.fromHex(preUtxoHex);
            const tapLeavesScript = yield this.getTapLeavesScript(stakerPubKey, covenantPubkey, protocolPubkey);
            txb.addInputs([
                {
                    hash: preUTXO.getId(),
                    index: 0,
                    witnessUtxo: {
                        script: preUTXO.outs[0].script,
                        value: preUTXO.outs[0].value,
                    },
                    tapLeafScript: [tapLeavesScript.slashingLeaf],
                    sequence: 0xfffffffd, // big endian
                },
            ]);
            txb.addOutputs([
                {
                    address: burnAddress,
                    value: preUTXO.outs[0].value - fee, // Amount in satoshis
                },
            ]);
            return {
                psbt: txb,
                toSignInputs: [
                    {
                        index: 0,
                        publicKey: stakerPubKey.toString("hex"),
                        disableTweakSigner: true,
                    },
                ],
            };
        });
    }
    getScriptP2TR(stakerPubKey, covenantPubkey, protocolPubkey) {
        return __awaiter(this, void 0, void 0, function* () {
            const script_p2tr = yield getTaprootAddress(stakerPubKey, covenantPubkey, protocolPubkey, __classPrivateFieldGet(this, _StakingTransaction_timeLock, "f"), __classPrivateFieldGet(this, _StakingTransaction_networkType, "f"));
            return script_p2tr;
        });
    }
    getTapLeavesScript(stakerPubKey, covenantPubkey, protocolPubkey) {
        return __awaiter(this, void 0, void 0, function* () {
            const tapScripts = yield getTapLeafScript(stakerPubKey, covenantPubkey, protocolPubkey, __classPrivateFieldGet(this, _StakingTransaction_timeLock, "f"), __classPrivateFieldGet(this, _StakingTransaction_networkType, "f"));
            return tapScripts;
        });
    }
}
exports.StakingTransaction = StakingTransaction;
_StakingTransaction_networkType = new WeakMap(), _StakingTransaction_changeAddress = new WeakMap(), _StakingTransaction_feeRate = new WeakMap(), _StakingTransaction_timeLock = new WeakMap(), _StakingTransaction_enableRBF = new WeakMap();
