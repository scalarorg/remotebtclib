"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenApi = void 0;
const axios_1 = __importDefault(require("axios"));
class RequestError extends Error {
    constructor(message, status, response) {
        super((response && response.config ? response.config.url : "") + message);
        this.message = message;
        this.status = status;
        this.response = response;
        this.isApiException = true;
    }
}
class OpenApi {
    constructor(params) {
        this.axios = axios_1.default.create({
            baseURL: params.baseUrl,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${params.apiKey}`,
            },
        });
        this.axios.interceptors.response.use(((response) => __awaiter(this, void 0, void 0, function* () {
            const res = response.data;
            if (res.code != 0) {
                throw new RequestError(res.msg);
            }
            return res.data;
        })), (error) => {
            if (error.response) {
                return Promise.reject(new RequestError(error.response.data, error.response.status, error.response));
            }
            if (error.isAxiosError) {
                return Promise.reject(new RequestError("noInternetConnection"));
            }
            return Promise.reject(error);
        });
    }
    createPutOnPrepare({ type, inscriptionId, initPrice, unitPrice, pubkey, marketType, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v3/market/${type}/auction/create_put_on`, {
                inscriptionId,
                initPrice,
                unitPrice,
                pubkey,
                marketType,
            });
            return response;
        });
    }
    confirmPutOn({ type, auctionId, psbt, fromBase64, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v3/market/${type}/auction/confirm_put_on`, {
                auctionId,
                psbt,
                fromBase64,
            });
            return response;
        });
    }
    createBidPrepare({ type, auctionId, bidPrice, address, pubkey, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v3/market/${type}/auction/create_bid_prepare`, {
                auctionId,
                bidPrice,
                address,
                pubkey,
            });
            return response;
        });
    }
    createBid({ type, address, auctionId, bidPrice, feeRate, pubkey, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v3/market/${type}/auction/create_bid`, {
                auctionId,
                feeRate,
                address,
                pubkey,
                bidPrice,
            });
            return response;
        });
    }
    confirmBid({ type, bidId, psbtBid, psbtBid2, auctionId, psbtSettle, fromBase64, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v3/market/${type}/auction/confirm_bid`, {
                auctionId,
                bidId,
                psbtBid,
                psbtBid2,
                psbtSettle,
                fromBase64,
            });
            return response;
        });
    }
    getInscriptionInfo(inscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.get(`/v1/indexer/inscription/info/${inscriptionId}`);
            return response;
        });
    }
    getAddressUtxoData(address, cursor = 0, size = 16) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.get(`/v1/indexer/address/${address}/utxo-data?cursor=${cursor}&size=${size}`);
            return response;
        });
    }
    pushtx(txHex) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v1/indexer/local_pushtx`, { txHex });
            return response;
        });
    }
    createBrc205ByteMint({ deployerAddress, deployerPubkey, receiveAddress, feeRate, outputValue, brc20Ticker, brc20Amount, devAddress, devFee, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v2/inscribe/order/create/brc20-5byte-mint`, {
                deployerAddress,
                deployerPubkey,
                receiveAddress,
                feeRate,
                outputValue,
                brc20Ticker,
                brc20Amount,
                devAddress,
                devFee,
            });
            return response;
        });
    }
    requestCommitBrc205ByteMint({ orderId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v2/inscribe/order/request-commit/brc20-5byte-mint`, {
                orderId,
            });
            return response;
        });
    }
    signCommitBrc205ByteMint({ orderId, psbt, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v2/inscribe/order/sign-commit/brc20-5byte-mint`, {
                orderId,
                psbt,
            });
            return response;
        });
    }
    signRevealBrc205ByteMint({ orderId, psbt, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.axios.post(`/v2/inscribe/order/sign-reveal/brc20-5byte-mint`, {
                orderId,
                psbt,
            });
            return response;
        });
    }
}
exports.OpenApi = OpenApi;
