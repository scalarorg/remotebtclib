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
var _UNISATStaker_stakerAddress, _UNISATStaker_stakerPubkey, _UNISATStaker_covenantPubkey, _UNISATStaker_protocolPubkey, _UNISATStaker_networkType, _UNISATStaker_timeLock, _UNISATStaker_feeRate;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNISATStaker = exports.unsignedTransaction = void 0;
const address_1 = require("@unisat/wallet-sdk/lib/address");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const estimate_1 = require("./transaction/estimate");
const unsignedTransaction = __importStar(require("./transaction/unsignedPsbt"));
exports.unsignedTransaction = __importStar(require("./transaction/unsignedPsbt"));
// work for UNISAT
class UNISATStaker {
    constructor(stakerAddress, stakerPubkey, covenantPubkey, protocolPubkey, networkType, timeLock, feeRate) {
        _UNISATStaker_stakerAddress.set(this, void 0); // unisat.getAccount()
        _UNISATStaker_stakerPubkey.set(this, void 0); // unisat.getPublickey()
        _UNISATStaker_covenantPubkey.set(this, void 0); // unisat.getPublickey()
        _UNISATStaker_protocolPubkey.set(this, void 0); // unisat.getPublickey()
        _UNISATStaker_networkType.set(this, void 0);
        _UNISATStaker_timeLock.set(this, void 0);
        _UNISATStaker_feeRate.set(this, void 0);
        __classPrivateFieldSet(this, _UNISATStaker_stakerAddress, stakerAddress, "f");
        __classPrivateFieldSet(this, _UNISATStaker_stakerPubkey, stakerPubkey, "f");
        __classPrivateFieldSet(this, _UNISATStaker_covenantPubkey, covenantPubkey, "f");
        __classPrivateFieldSet(this, _UNISATStaker_protocolPubkey, protocolPubkey, "f");
        __classPrivateFieldSet(this, _UNISATStaker_networkType, networkType, "f");
        __classPrivateFieldSet(this, _UNISATStaker_timeLock, timeLock, "f");
        __classPrivateFieldSet(this, _UNISATStaker_feeRate, feeRate, "f");
    }
    // Include fee
    getUnsignedStakingPsbt(btcUtxos, toAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            const staker = yield this.getStaker();
            const addressType = (0, address_1.decodeAddress)(__classPrivateFieldGet(this, _UNISATStaker_stakerAddress, "f")).addressType;
            const { psbt, toSignInputs } = yield staker.getStakingPsbt({
                btcUtxos: btcUtxos.map((v) => ({
                    txid: v.txid,
                    vout: v.vout,
                    satoshis: v.satoshi,
                    scriptPk: v.scriptPk,
                    pubkey: __classPrivateFieldGet(this, _UNISATStaker_stakerPubkey, "f"),
                    addressType,
                    inscriptions: v.inscriptions,
                    atomicals: [],
                    rawtx: v.rawtx, // only for p2pkh
                })),
                amount: toAmount,
                stakerPubKey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_stakerPubkey, "f"), "hex"),
                covenantPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_covenantPubkey, "f"), "hex"),
                protocolPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_protocolPubkey, "f"), "hex"),
            });
            return { psbt, toSignInputs };
        });
    }
    getUnsignedUnstakingPsbtNoFee(signedStakingTransactionHex) {
        return __awaiter(this, void 0, void 0, function* () {
            const staker = yield this.getStaker();
            const { psbt, toSignInputs } = yield staker.getUnstakingPsbt({
                preUtxoHex: signedStakingTransactionHex,
                stakerPubKey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_stakerPubkey, "f"), "hex"),
                covenantPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_covenantPubkey, "f"), "hex"),
                protocolPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_protocolPubkey, "f"), "hex"),
            });
            return { psbt, toSignInputs };
        });
    }
    getUnsignedUnstakingPsbt(signedStakingTransactionHex, noFeePsbtHex) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = bitcoin.Psbt.fromHex(noFeePsbtHex).extractTransaction().toHex();
            const fee = yield (0, estimate_1.estimateFee)(tx, __classPrivateFieldGet(this, _UNISATStaker_feeRate, "f"));
            const staker = yield this.getStaker();
            const { psbt, toSignInputs } = yield staker.getUnstakingPsbt({
                preUtxoHex: signedStakingTransactionHex,
                stakerPubKey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_stakerPubkey, "f"), "hex"),
                covenantPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_covenantPubkey, "f"), "hex"),
                protocolPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_protocolPubkey, "f"), "hex"),
                fee,
            });
            return { psbt, toSignInputs };
        });
    }
    getUnsignedSlashingPsbtNoFee(signedStakingPsbtHex, burnAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const staker = yield this.getStaker();
            const { psbt, toSignInputs } = yield staker.getSlashingPsbt({
                preUtxoHex: signedStakingPsbtHex,
                stakerPubKey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_stakerPubkey, "f"), "hex"),
                covenantPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_covenantPubkey, "f"), "hex"),
                protocolPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_protocolPubkey, "f"), "hex"),
                burnAddress: burnAddress,
            });
            return { psbt, toSignInputs };
        });
    }
    getUnsignedSlashingPsbt(signedStakingPsbtHex, burnAddress, noFeePsbtHex) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = bitcoin.Psbt.fromHex(noFeePsbtHex).extractTransaction().toHex();
            const fee = yield (0, estimate_1.estimateFee)(tx, __classPrivateFieldGet(this, _UNISATStaker_feeRate, "f"));
            const staker = yield this.getStaker();
            const { psbt, toSignInputs } = yield staker.getSlashingPsbt({
                preUtxoHex: signedStakingPsbtHex,
                stakerPubKey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_stakerPubkey, "f"), "hex"),
                covenantPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_covenantPubkey, "f"), "hex"),
                protocolPubkey: Buffer.from(__classPrivateFieldGet(this, _UNISATStaker_protocolPubkey, "f"), "hex"),
                burnAddress: burnAddress,
                fee,
            });
            return { psbt, toSignInputs };
        });
    }
    setCovenantPubkey(covenantPubkey) {
        __classPrivateFieldSet(this, _UNISATStaker_covenantPubkey, covenantPubkey, "f");
    }
    setProtocolPubkey(protocolPubkey) {
        __classPrivateFieldSet(this, _UNISATStaker_protocolPubkey, protocolPubkey, "f");
    }
    setTimeLock(timeLock) {
        __classPrivateFieldSet(this, _UNISATStaker_timeLock, timeLock, "f");
    }
    setFeeRate(feeRate) {
        __classPrivateFieldSet(this, _UNISATStaker_feeRate, feeRate, "f");
    }
    getProtocolPubkey() {
        return __awaiter(this, void 0, void 0, function* () {
            return __classPrivateFieldGet(this, _UNISATStaker_protocolPubkey, "f");
        });
    }
    getTimeLock() {
        return __awaiter(this, void 0, void 0, function* () {
            return __classPrivateFieldGet(this, _UNISATStaker_timeLock, "f");
        });
    }
    getFeeRate() {
        return __awaiter(this, void 0, void 0, function* () {
            return __classPrivateFieldGet(this, _UNISATStaker_feeRate, "f");
        });
    }
    getStaker() {
        return __awaiter(this, void 0, void 0, function* () {
            return new unsignedTransaction.StakingTransaction(__classPrivateFieldGet(this, _UNISATStaker_networkType, "f"), __classPrivateFieldGet(this, _UNISATStaker_stakerAddress, "f"), __classPrivateFieldGet(this, _UNISATStaker_feeRate, "f"), __classPrivateFieldGet(this, _UNISATStaker_timeLock, "f"));
        });
    }
}
exports.UNISATStaker = UNISATStaker;
_UNISATStaker_stakerAddress = new WeakMap(), _UNISATStaker_stakerPubkey = new WeakMap(), _UNISATStaker_covenantPubkey = new WeakMap(), _UNISATStaker_protocolPubkey = new WeakMap(), _UNISATStaker_networkType = new WeakMap(), _UNISATStaker_timeLock = new WeakMap(), _UNISATStaker_feeRate = new WeakMap();
