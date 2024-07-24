interface CreatePutOnPrepareResponse {
    auctionId: string;
    psbt: string;
    signIndexes: number[];
}
export interface CreateBidPrepareResponse {
    serverFee: number;
    serverReal: number;
    serverFeeRate: number;
    txSize: number;
    feeRate: number;
    nftValue: number;
    discounts: any[];
    inscriptionCount: number;
    availableBalance: number;
    allBalance: number;
}
export interface UTXO {
    address: string;
    codeType: number;
    height: number;
    idx: number;
    inscriptions: {
        inscriptionId: string;
        inscriptionNumber: number;
        isBRC20: boolean;
        moved: boolean;
        offset: number;
    }[];
    isOpInRBF: boolean;
    satoshi: number;
    scriptPk: string;
    scriptType: string;
    txid: string;
    vout: number;
    rawtx?: string;
}
interface InscriptionInfo {
    address: string;
    inscriptionNumber: number;
    contentType: string;
    utxo: UTXO;
}
export declare class OpenApi {
    private axios;
    constructor(params: {
        baseUrl: string;
        apiKey: string;
    });
    createPutOnPrepare({ type, inscriptionId, initPrice, unitPrice, pubkey, marketType, }: {
        type: "brc20" | "collection" | "domain";
        inscriptionId: string;
        initPrice: string;
        unitPrice: string;
        pubkey: string;
        marketType: "fixedPrice";
    }): Promise<CreatePutOnPrepareResponse>;
    confirmPutOn({ type, auctionId, psbt, fromBase64, }: {
        type: "brc20" | "collection" | "domain";
        auctionId: string;
        psbt: string;
        fromBase64: boolean;
    }): Promise<{}>;
    createBidPrepare({ type, auctionId, bidPrice, address, pubkey, }: {
        type: "brc20" | "collection" | "domain";
        auctionId: string;
        bidPrice: number;
        address: string;
        pubkey: string;
    }): Promise<CreateBidPrepareResponse>;
    createBid({ type, address, auctionId, bidPrice, feeRate, pubkey, }: {
        type: "brc20" | "collection" | "domain";
        address: string;
        auctionId: string;
        bidPrice: number;
        feeRate: number;
        pubkey: string;
    }): Promise<{
        bidId: string;
        psbtBid: string;
        serverFee: number;
        networkFee: number;
        feeRate: number;
        nftValue: number;
        bidSignIndexes: number[];
    }>;
    confirmBid({ type, bidId, psbtBid, psbtBid2, auctionId, psbtSettle, fromBase64, }: {
        type: "brc20" | "collection" | "domain";
        auctionId: string;
        fromBase64: boolean;
        bidId: string;
        psbtBid: string;
        psbtBid2: string;
        psbtSettle: string;
    }): Promise<{}>;
    getInscriptionInfo(inscriptionId: string): Promise<InscriptionInfo>;
    getAddressUtxoData(address: string, cursor?: number, size?: number): Promise<{
        cursor: number;
        total: number;
        totalConfirmed: number;
        totalUnconfirmed: number;
        totalUnconfirmedSpend: number;
        utxo: UTXO[];
    }>;
    pushtx(txHex: string): Promise<string>;
    createBrc205ByteMint({ deployerAddress, deployerPubkey, receiveAddress, feeRate, outputValue, brc20Ticker, brc20Amount, devAddress, devFee, }: {
        deployerAddress: string;
        deployerPubkey: string;
        receiveAddress: string;
        feeRate: number;
        outputValue: number;
        brc20Ticker: string;
        brc20Amount: string;
        devAddress: string;
        devFee: number;
    }): Promise<{
        orderId: string;
    }>;
    requestCommitBrc205ByteMint({ orderId }: {
        orderId: string;
    }): Promise<{
        psbtHex: string;
        inputsToSign: {
            address: string;
            signingIndexes: number[];
        }[];
    }>;
    signCommitBrc205ByteMint({ orderId, psbt, }: {
        orderId: string;
        psbt: string;
    }): Promise<{
        psbtHex: string;
        inputsToSign: {
            address: string;
            signingIndexes: number[];
        }[];
    }>;
    signRevealBrc205ByteMint({ orderId, psbt, }: {
        orderId: string;
        psbt: string;
    }): Promise<{
        inscriptionId: string;
    }>;
}
export {};
