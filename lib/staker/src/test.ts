import { UNISATStaker } from ".";
import { OpenApi } from "./open-api";
import * as bitcoin from "bitcoinjs-lib";
import mempoolJS from "@mempool/mempool.js";
import { ECPair } from "@unisat/wallet-sdk/lib/bitcoin-core";

const feesRecommended = async () => {
  const {
    bitcoin: { fees },
  } = mempoolJS({
    hostname: "mempool.space",
    network: "testnet",
  });

  const feesRecommended = await fees.getFeesRecommended();
  return feesRecommended;
};
feesRecommended();
async function test() {
  const openapi = new OpenApi({
    baseUrl: "https://open-api-testnet.unisat.io",
    apiKey: "?",
  });
  const btcUtxos = await openapi.getAddressUtxoData(
    "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0"
  );
  const feeRate = (await feesRecommended()).fastestFee; // mempool api
  const timeLock = 0x00400001;
  const networkType = bitcoin.networks.testnet;
  const staker_keyPair = ECPair.fromWIF(
    "?",
    networkType
  );
  const covenant_keyPair = ECPair.fromWIF(
    "?",
    networkType
  );
  const protocol_keyPair = ECPair.fromWIF(
    "?",
    networkType
  );
  const covenantPubkey = covenant_keyPair.publicKey.toString("hex");
  const protocolPubkey = protocol_keyPair.publicKey.toString("hex");
  const staker = new UNISATStaker(
    "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0",
    staker_keyPair.publicKey.toString("hex"),
    covenantPubkey,
    protocolPubkey,
    networkType,
    feeRate,
    timeLock
  );
  const amount = 100000;
  const {psbt, toSignInputs} = await staker.getUnsignedStakingPsbt(btcUtxos.utxo, amount);
  console.log(psbt.toHex())
  console.log(toSignInputs)
  // UNSTAKING
  // const psbtHex = bitcoin.Psbt.fromHex(
  //   "70736274ff0100a60200000002f352feac6fad38482f61685c186f94f8fc489ad336ee8bac0b6f1f820d2bc9940000000000fdffffffb11206bc5f9415e4142dc7dd21abe3e4ae4618b225758b9ed6d5bd8aede47eca0100000000fdffffff02a086010000000000225120cbc9a202530c58a2dc93f9824ce99979e0238fd9b47eca43d60e70754aa37e809626150000000000160014d6daf3fba915fed7eb3a88d850faccb9fd00db17000000000001011f306f010000000000160014d6daf3fba915fed7eb3a88d850faccb9fd00db1701086b02473044022062566f83ca545a3e5fce85b436acb4b5c7cff75ab5ce8309fb27bba27deb062c02204fef9c6fa51e448ead779acfd265fc72a7d4ee3660351d90203c77a2686164e40121022ae24aecee27d2f6b4c80836dfe1e86a6f9a14a4dd3b1d269bdeda4e6834e82f0001011fd64b150000000000160014d6daf3fba915fed7eb3a88d850faccb9fd00db1701086c02483045022100b7c166934d6f1213ea36ab479a705afc86780768bf27dd5b32600421cb2fa6d302201e2fdd7e6c64675681fa1946df9b688659346a8558d5513dc8007e33f371fd3e0121022ae24aecee27d2f6b4c80836dfe1e86a6f9a14a4dd3b1d269bdeda4e6834e82f000000"
  // );
  // let { psbt, toSignInputs } = await staker.getUnsignedUnstakingPsbtNoFee(
  //   psbtHex.extractTransaction().toHex()
  // );
  // const psbtNoFee = bitcoin.Psbt.fromHex(
  //   "70736274ff0100520200000001c9009b2639928498b4e3fbeaf4c537ab4ea8526349265aa162431c8c8f65d92d00000000000100400001a086010000000000160014d6daf3fba915fed7eb3a88d850faccb9fd00db17000000000001012ba086010000000000225120cbc9a202530c58a2dc93f9824ce99979e0238fd9b47eca43d60e70754aa37e800108ad0340addae15be24d767d813fdda138841ebd06f2e1459e658d175aa232cd4d3de1fe09c24277779201b2e4f6e77a3594376d76ada917ffe0c0e4dcf160636311b2742803010040b275202ae24aecee27d2f6b4c80836dfe1e86a6f9a14a4dd3b1d269bdeda4e6834e82fac41c050929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0a6cc9a87504bc0ba4db50708e623817e64737abdc68c6ef05e3e4389a7a6cea90000"
  // );
  // const sending_unstaking = await staker.getUnsignedUnstakingPsbt(
  //   psbtHex.extractTransaction().toHex(),
  //   psbtNoFee.toHex()
  // );
  // console.log(sending_unstaking.psbt.toHex(), sending_unstaking.toSignInputs);
  // SLASHING
  // const burnAddress = "tb1q6md087afzhld06e63rv9p7kvh87spkchyguwg0";
  // const {psbt, toSignInputs} = await staker.getUnsignedSlashingPsbt("020000000001015f28a10a266c4c744d146529f6ac08da1886d55ed1aaf51ce08c8bff50b0094e0100000000fdffffff02a086010000000000225120cbc9a202530c58a2dc93f9824ce99979e0238fd9b47eca43d60e70754aa37e80d64b150000000000160014d6daf3fba915fed7eb3a88d850faccb9fd00db1702483045022100c80dc3cd85aafef920a2d16c843d347d39152f60c35ca1f80df58b03cbc4fcb402204a536fe919b88ad3266143897e47e45015b2f4f7df7cefc43fa6b97fb927bd590121022ae24aecee27d2f6b4c80836dfe1e86a6f9a14a4dd3b1d269bdeda4e6834e82f00000000",burnAddress)
  // console.log(psbt.toHex(),toSignInputs)
}
test();
