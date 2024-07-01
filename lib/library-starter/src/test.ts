import { OpenApi } from "./open-api";
import * as bitcoin from "bitcoinjs-lib";
import * as mylib from "./index";
import { ecc } from "@unisat/wallet-sdk/lib/bitcoin-core";
import { ECPair } from "@unisat/wallet-sdk/lib/bitcoin-core";
import { AddressType } from "@unisat/wallet-sdk";
import mempoolJS from "@mempool/mempool.js";
import { tweakSigner } from "@unisat/wallet-sdk/lib/utils";

const init = async () => {
  const {
    bitcoin: { fees },
  } = mempoolJS({
    hostname: "mempool.space",
    network: "testnet",
  });

  const feesRecommended = await fees.getFeesRecommended();
  // console.log(feesRecommended);
};
init();
async function test() {
  const openapi = new OpenApi({
    baseUrl: "https://open-api-testnet.unisat.io",
    apiKey: "95c9a82f28ff0f6a46fe127748448ce7adebb38aab34600af9e150e5caffabdb",
  });
  const btcUtxos = await openapi.getAddressUtxoData(
    "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0"
  );
  const feeRate = 23; // mempool api
  const timeLock = 0x00400001;
  const networkType = bitcoin.networks.testnet;
  const changeAddress = "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0";

  const staker = new mylib.unsignedTransaction.StakingTransaction(
    networkType,
    changeAddress,
    feeRate,
    timeLock
  );
  const stakerPubKey = ECPair.fromWIF(
    networkType
  );
  const covenant = ECPair.fromWIF(
    networkType
  );
  const protocol = ECPair.fromWIF(
    networkType
  );
  const covenantPubkey = covenant.publicKey;
  const protocolPubkey = protocol.publicKey;
  const amount = 100000;
  const { psbt, toSignInputs } = await staker.getStakingPsbt({
    btcUtxos: btcUtxos.utxo.map((v) => ({
      txid: v.txid,
      vout: v.vout,
      satoshis: v.satoshi,
      scriptPk: v.scriptPk,
      pubkey: stakerPubKey.publicKey.toString("hex"),
      addressType: AddressType.P2WPKH,
      inscriptions: v.inscriptions,
      atomicals: [],
      rawtx: v.rawtx, // only for p2pkh
    })),
    amount,
    stakerPubKey: Buffer.from(stakerPubKey.publicKey.toString("hex"), "hex"),
    covenantPubkey,
    protocolPubkey,
  });
  // console.log(psbt.toHex(), toSignInputs);
  const preUTXO =
    "0200000000010170920a7d984bf2cb5a1c713e0d9b5f3508cf352e17a151322fd37910bb546c0e0100000000fdffffff02a086010000000000225120fcdf2fb129e77a68eae02732a198165ab7bbf25abacef0d724653c42d39089fd6570180000000000160014d6daf3fba915fed7eb3a88d850faccb9fd00db17024730440220072c61fc392d0725c388161fb967964f05a2e6b052adbcecceea8ecb88723cd80220495db2fd10206758f76bd8a81e5d6bc98d18a26c3f1ea55754fa0e56ee223eb30121022ae24aecee27d2f6b4c80836dfe1e86a6f9a14a4dd3b1d269bdeda4e6834e82f00000000";
  const burnAddress = "tb1q7j2rs9lfpawgjdr4cxdutvtqqexz5msrp7axx3";
  const slashingPsbt = await staker.getSlashingPsbt({
    preUtxoHex: preUTXO,
    stakerPubKey: Buffer.from(stakerPubKey.publicKey.toString("hex"), "hex"),
    covenantPubkey,
    protocolPubkey,
    burnAddress,
  });
  const txb = slashingPsbt.psbt;
  txb.signInput(0, covenant);
  txb.signInput(0,protocol)
  txb.finalizeAllInputs();
  const tx = txb.extractTransaction();
  console.log(tx.toHex())

  
  // const unStakingPsbt = await staker.getUnstakingPsbt({
  //   preUtxoHex: preUTXO,
  //   stakerPubKey: Buffer.from(stakerPubKey.publicKey.toString('hex'), "hex"),
  //   covenantPubkey,
  //   protocolPubkey,
  // });
  // const txb = unStakingPsbt.psbt;
  // txb.signInput(0, stakerPubKey);

  // const script_p2tr = await staker.getScriptP2TR(
  //   Buffer.from(stakerPubKey, "hex"),
  //   covenantPubkey,
  //   protocolPubkey
  // );
  // const tapLeavesScript = await staker.getTapLeavesScript(
  //   Buffer.from(stakerPubKey, "hex"),
  //   covenantPubkey,
  //   protocolPubkey
  // );
  // async function test() {
  //   const my_hex =
  //     "020000000001015df84a0d6a6abf4e468721ca17ed9f9cc6602e09f89d242d15979621417ff7fa0100000000fdffffff02a08601000000000022512085249a378181791f9d9c6e0c4a6efe7d32df33a667afdbea4e04214e6ba8bcff5a5b1a0000000000160014d6daf3fba915fed7eb3a88d850faccb9fd00db1702483045022100fd567050f5f37864279cb438b2595f41ed25809df0a4f53b0b258c4e1b75d4dc0220523098a2b367e4a082d8706a4d5e8bf3351b53fec8e55bb28368cfd026acffff0121022ae24aecee27d2f6b4c80836dfe1e86a6f9a14a4dd3b1d269bdeda4e6834e82f00000000";

  //   const txb = new bitcoin.Psbt({ network: networkType });
  //   // Default setting
  //   txb.setVersion(2);
  //   txb.setLocktime(0);

  //   const preUTXO = bitcoin.Transaction.fromHex(my_hex);
  //   txb.addInputs([
  //     {
  //       hash: preUTXO.getId(),
  //       index: 0, // Index of the output in the previous transaction
  //       witnessUtxo: {
  //         script: preUTXO.outs[0].script,
  //         value: preUTXO.outs[0].value,
  //       },
  //       tapLeafScript: [tapLeavesScript.timeLockLeaf],
  //       sequence: 0xfffffffd, // big endian
  //     },
  //   ]);
  //   txb.addOutputs([
  //     {
  //       address: "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0",
  //       value: preUTXO.outs[0].value - 6000, // Amount in satoshis
  //     },
  //   ]);
  //   // Create tweaked key to spend key path
  //   const keypair_internal = ECPair.fromWIF(
  //     networkType
  //   );
  //   console.log(txb.toHex());
  //   txb.signInput(0, keypair_internal);
  //   // txb.signInput(0, tweakedKeyPair); // NOTE, with taproot spend, we need to use Tweaked Signer
  //   txb.finalizeAllInputs();

  // const tx = txb.extractTransaction();
  // console.log(txb.toHex())
  // }
}

test();
