import { OpenApi } from "./open-api";
import { NetworkType } from "@unisat/wallet-sdk/lib/network";
import { AddressType } from "@unisat/wallet-sdk";
import * as mylib from "./index";
async function test() {
  const openapi = new OpenApi({
    baseUrl: "https://open-api-testnet.unisat.io",
    apiKey: "95c9a82f28ff0f6a46fe127748448ce7adebb38aab34600af9e150e5caffabdb",
  });
  const btcUtxos = await openapi.getAddressUtxoData(
    "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0"
  );
  const { psbt, toSignInputs } = await mylib.unsignedTransaction.g({
    btcUtxos: btcUtxos.utxo.map((v: any) => ({
      txid: v.txid,
      vout: v.vout,
      satoshis: v.satoshi,
      scriptPk: v.scriptPk,
      pubkey:
        "022ae24aecee27d2f6b4c80836dfe1e86a6f9a14a4dd3b1d269bdeda4e6834e82f",
      addressType: AddressType.P2WPKH,
      inscriptions: v.inscriptions,
      atomicals: [],
    })),
    tos: [
      {
        address: "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0",
        satoshis: 100000,
      },
    ],
    networkType: NetworkType.TESTNET,
    changeAddress: "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0",
    feeRate: 1,
  });
  console.log(psbt.data.inputs)
  console.log(toSignInputs);
}
test();
