import { PsbtInput } from "bip174/src/lib/interfaces";
import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import dotenv from "dotenv";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

import { Staker, UnStaker } from "..";
import { UTXO } from "../types/utxo";
import { API, getUTXOs } from "../utils/api";
import { witnessStackToScriptWitness } from "../utils/bitcoin";
dotenv.config({ path: "../../.env" });

// Initialize the ECC library
// bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);

const networkType = bitcoin.networks.testnet;
const address = "tb1qpzmmqzc0wgx0tnp70cu24ts62u4ev2ey8xlgn3";
// 51207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be91
const staker_keyPair = ECPair.fromWIF(process.env.stakerWIF!, networkType);
console.log(staker_keyPair.publicKey.toString("hex"));
const protocol_keyPair = ECPair.fromWIF(process.env.protocolWIF!, networkType);
const covenant_1_keyPair = ECPair.fromWIF(
  process.env.covenant1WIF!,
  networkType,
);
const covenant_2_keyPair = ECPair.fromWIF(
  process.env.covenant2WIF!,
  networkType,
);
const covenant_3_keyPair = ECPair.fromWIF(
  process.env.covenant3WIF!,
  networkType,
);
const covenant_4_keyPair = ECPair.fromWIF(
  process.env.covenant4WIF!,
  networkType,
);
const covenant_5_keyPair = ECPair.fromWIF(
  process.env.covenant5WIF!,
  networkType,
);

const covenants_keyPairs = [
  covenant_1_keyPair,
  covenant_2_keyPair,
  covenant_3_keyPair,
  covenant_4_keyPair,
  covenant_5_keyPair,
];
const covs = covenants_keyPairs.map((c) => c.publicKey.toString("hex"));
console.log(covs);
const sorted_covenants = covenants_keyPairs.sort((a, b) =>
  Buffer.compare(toXOnly(a.publicKey), toXOnly(b.publicKey)),
);
// const covs = [
//   "035b004b4307b5bc768e2d3a359a34255369a00eda504ba10fc9aeac8db525098b",
//   "02104f3fd30f56908568cab4a0c5bb2345561bfad7bf82bd0b1bfda7dbddafffd2",
//   "022c9a3bd80bf81edf06c840456b3a52e69daf46e987b6493f8d51197e32ba5bdb",
//   "0359bcff3ec8b799430944180772867534ba5cae4757e0354a099cd98f8fe1b75e",
//   "0227f8ffdb860f72e36bc98847dafecf09cd5fe3eb9964cecd51e564cbd7f8f5b9",
// ];

// // take p2wpkh of each covs :
// console.log(
//   sorted_covenants.map(
//     (c) =>
//       bitcoin.payments.p2wpkh({ pubkey: c.publicKey, network: networkType })
//         .address
//   )
// );

const qorum = 3;

const tag = "01020304";
const version = 0;

const chainID = "aa36a7";
const chainIdUserAddress = "130C4810D57140e1E62967cBF742CaEaE91b6ecE";
const chainSmartContractAddress = "768E8De8cf0c7747D41f75F83C914a19C5921Cf3";
const mintingAmount = 10000; // in satoshis

const staker = new Staker(
  address,
  staker_keyPair.publicKey.toString("hex"),
  protocol_keyPair.publicKey.toString("hex"),
  covs,
  qorum,
  tag,
  version,
  chainID,
  chainIdUserAddress,
  chainSmartContractAddress,
  mintingAmount,
);
// const sortedCovenants = covenants_keyPairs.sort((a, b) =>
//   Buffer.compare(toXOnly(a.publicKey), toXOnly(b.publicKey))
// );

const feeRate = 10;
const rbf = true;

async function vault(option: string = "test") {
  const regularUTXOs: UTXO[] = await getUTXOs(address); // Mempool call api
  const stakingAmount = 10000; // in statoshis
  const { psbt: unsignedVaultPsbt, feeEstimate: fee } =
    await staker.getUnsignedVaultPsbt(
      regularUTXOs,
      stakingAmount,
      feeRate,
      rbf,
    );

  unsignedVaultPsbt.signAllInputs(staker_keyPair);
  unsignedVaultPsbt.finalizeAllInputs();
  let tx = unsignedVaultPsbt.extractTransaction(true);
  console.log(tx.virtualSize());
  console.log("fee: ", fee);
  console.log(tx.toHex());
  if (option === "test") {
    API(process.env.url!, "testmempoolaccept", [[tx.toHex()]]); // Enable if want to push
  } else if (option === "send") {
    API(process.env.url!, "sendrawtransaction", [tx.toHex()]); // Enable if want to push
  } else {
    console.log("Invalid option");
  }
}

async function burning(tx: string, option: string = "test") {
  const unStaker = new UnStaker(address, tx, covs, qorum);
  //////////////////////////// Burning ////////////////////////////
  const {
    psbt: burningPsbt,
    feeEstimate: fee,
    burningLeaf,
  } = await unStaker.getUnsignedBurningPsbt(address, feeRate, rbf);
  // burningPsbt.signInput(0, staker_keyPair);
  // console.log(burningPsbt.data.inputs[0].witnessUtxo?.script.toString("hex"));
  console.log(burningPsbt.toBase64());
  // const staker_signature =
  //   burningPsbt.data.inputs[0].tapScriptSig![0].signature;
  // console.log(staker_signature.toString("hex"));
  burningPsbt.finalizeInput(0);
  // console.log(burningPsbt.data.inputs[0])
  // burningPsbt.signInput(0, protocol_keyPair);
  // const test = burningPsbt.toBase64();
  // const test_new_psbt = bitcoin.Psbt.fromBase64(test);
  // test_new_psbt.signInput(0, protocol_keyPair);
  // test_new_psbt.finalizeInput(0);
  const burningTx = burningPsbt.extractTransaction(true);
  console.log(fee);
  console.log(burningTx.virtualSize());
  if (option === "test") {
    API(process.env.url!, "testmempoolaccept", [[burningTx.toHex()]]); // Enable if want to push
  } else if (option === "send") {
    API(process.env.url!, "sendrawtransaction", [burningTx.toHex()]); // Enable if want to push
  } else {
    console.log("Invalid option");
  }
}

async function slashingOrLostKey(tx: string, option: string = "test") {
  const unStaker = new UnStaker(address, tx, covs, qorum);
  // SETUP leaves
  //////////////////////////// Slashing ////////////////////////////
  const {
    psbt: slashingOrLostKeyPsbt,
    feeEstimate: fee,
    SolLeaf,
  } = await unStaker.getUnsignedSlashingOrLostKeyPsbt(address, feeRate, rbf);
  const slashingFinalizer = (_inputIndex: number, input: PsbtInput) => {
    const empty_vector = Buffer.from([]);
    const scriptSolution = [
      input.tapScriptSig![6].signature,
      // input.tapScriptSig![5].signature,
      empty_vector,
      input.tapScriptSig![4].signature,
      input.tapScriptSig![3].signature,
      // input.tapScriptSig![2].signature,
      empty_vector,
      input.tapScriptSig![1].signature,
      input.tapScriptSig![0].signature,
    ];
    const witness = scriptSolution
      .concat(SolLeaf.script)
      .concat(SolLeaf.controlBlock);
    return {
      finalScriptWitness: witnessStackToScriptWitness(witness),
    };
  };

  slashingOrLostKeyPsbt.signInput(0, staker_keyPair);
  slashingOrLostKeyPsbt.signInput(0, protocol_keyPair);
  // slashingOrLostKeyPsbt.signInput(0, sortedCovenants[0]);
  // slashingOrLostKeyPsbt.signInput(0, sortedCovenants[1]);
  // slashingOrLostKeyPsbt.signInput(0, sortedCovenants[2]);
  // slashingOrLostKeyPsbt.signInput(0, sortedCovenants[3]);
  // slashingOrLostKeyPsbt.signInput(0, sortedCovenants[4]);
  slashingOrLostKeyPsbt.finalizeInput(0, slashingFinalizer);
  const slashingTx = slashingOrLostKeyPsbt.extractTransaction(true);
  console.log(fee);
  console.log(slashingTx.virtualSize());
  if (option === "test") {
    API(process.env.url!, "testmempoolaccept", [[slashingTx.toHex()]]); // Enable if want to push
  } else if (option === "send") {
    API(process.env.url!, "sendrawtransaction", [slashingTx.toHex()]); // Enable if want to push
  } else {
    console.log("Invalid option");
  }
}

async function burnWithoutDApp(tx: string, option: string = "test") {
  const unStaker = new UnStaker(address, tx, covs, qorum);
  // SETUP leaves
  //////////////////////////// Burning Without DApp ////////////////////////////
  const {
    psbt: burnWithoutDAppPsbt,
    feeEstimate: fee,
    BWoD,
  } = await unStaker.getUnsignedBurnWithoutDAppPsbt(address, feeRate, rbf);
  // convert to Tx hex
  burnWithoutDAppPsbt.signInput(0, staker_keyPair);
  console.log(123);
  burnWithoutDAppPsbt.signInput(0, covenant_1_keyPair);
  // burnWithoutDAppPsbt.signInput(0,covenant_2_keyPair)
  // burnWithoutDAppPsbt.signInput(0,covenant_3_keyPair)
  // burnWithoutDAppPsbt.signInput(0,covenant_4_keyPair)
  // burnWithoutDAppPsbt.signInput(0,covenant_5_keyPair)
  console.log(
    burnWithoutDAppPsbt.data.inputs[0].tapScriptSig?.map((x) =>
      x.signature.toString("hex"),
    ),
  );
  burnWithoutDAppPsbt.finalizeInput(0);
  const burnWithoutDAppTx = burnWithoutDAppPsbt.extractTransaction(true);
  // console.log(burnWithoutDAppTx.toHex());
  // console.log(fee);
  // console.log(burnWithoutDAppTx.virtualSize());
  if (option === "test") {
    API(process.env.url!, "testmempoolaccept", [[burnWithoutDAppTx.toHex()]]); // Enable if want to push
  } else if (option === "send") {
    API(process.env.url!, "sendrawtransaction", [burnWithoutDAppTx.toHex()]); // Enable if want to push
  } else {
    console.log("Invalid option");
  }
}

const tx =
  "02000000000101bb9eea06b09b5b73e1bcb6bf64a139ea5f5221aef05aad37ded744a29dc3abef0100000000fdffffff0410270000000000002251207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be910000000000000000476a4501020304002b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d00000000000000003a6a380000000000aa36a7469f0a64d5ede64fcaf161952657aaf4059040de768e8de8cf0c7747d41f75f83c914a19c5921cf30000000000002710a85f0e000000000016001408b7b00b0f720cf5cc3e7e38aaae1a572b962b240247304402202243056215e71a6b67c6d14562bb293c989539dae2498e85116c747730ccf76f02200dee6072ddce298bf9fbc3be6e6f09bef7ff36060dadf5be4d0ab57e33d2fa220121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d00000000";
// vault("send");
burning(tx, "test");
// slashingOrLostKey(tx);
// burnWithoutDApp(tx, "test");
