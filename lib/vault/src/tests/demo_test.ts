import { Staker } from "..";
import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import { witnessStackToScriptWitness } from "../utils/bitcoin";
import { PsbtInput } from "bip174/src/lib/interfaces";
import { UTXO } from "../types/utxo";
import { API, getUTXOs } from "../utils/api";

import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

// Initialize the ECC library
bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);

const networkType = bitcoin.networks.testnet;
const address = "tb1qpzmmqzc0wgx0tnp70cu24ts62u4ev2ey8xlgn3";
// 51207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be91
const staker_keyPair = ECPair.fromWIF(process.env.stakerWIF!, networkType);
const protocol_keyPair = ECPair.fromWIF(process.env.protocolWIF!, networkType);
const covenant_1_keyPair = ECPair.fromWIF(
  process.env.covenant1WIF!,
  networkType
);
const covenant_2_keyPair = ECPair.fromWIF(
  process.env.covenant2WIF!,
  networkType
);
const covenant_3_keyPair = ECPair.fromWIF(
  process.env.covenant3WIF!,
  networkType
);
const covenant_4_keyPair = ECPair.fromWIF(
  process.env.covenant4WIF!,
  networkType
);
const covenant_5_keyPair = ECPair.fromWIF(
  process.env.covenant5WIF!,
  networkType
);

const covenants_keyPairs = [
  covenant_1_keyPair,
  covenant_2_keyPair,
  covenant_3_keyPair,
  covenant_4_keyPair,
  covenant_5_keyPair,
];
const qorum = 3;

const tag = "01020304";
const version = 0;
const chainID = "01";
const chainIdUserAddress = "6bb9F03858C8ed34CB6CeB2bB26B17da80Bc512C";
const chainSmartContractAddress = "B5065Df90c390a7c5318f822b0Fa96Cde2f33051";
const mintingAmount = "100000"; // in satoshis

const staker = new Staker(
  address,
  staker_keyPair.publicKey.toString("hex"),
  protocol_keyPair.publicKey.toString("hex"),
  covenants_keyPairs.map((c) => c.publicKey.toString("hex")),
  qorum,
  tag,
  version,
  chainID,
  chainIdUserAddress,
  chainSmartContractAddress,
  mintingAmount
);
const sortedCovenants = covenants_keyPairs.sort((a, b) =>
  Buffer.compare(toXOnly(a.publicKey), toXOnly(b.publicKey))
);

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
      rbf
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

async function burning(tx: bitcoin.Transaction, option: string = "test") {
  // SETUP leaves
  const tapLeaves = (await staker.getStaker()).getTapLeavesScript();
  //////////////////////////// Burning ////////////////////////////
  const burningLeaf = (await tapLeaves).burningLeaf;
  const burningFinalizer = (_inputIndex: number, input: PsbtInput) => {
    const empty_vector = Buffer.from([]);
    const scriptSolution = [
      input.tapScriptSig![1].signature,
      input.tapScriptSig![0].signature,
    ];
    const witness = scriptSolution
      .concat(burningLeaf.script)
      .concat(burningLeaf.controlBlock);
    return {
      finalScriptWitness: witnessStackToScriptWitness(witness),
    };
  };

  const { psbt: burningPsbt, feeEstimate: fee } =
    await staker.getUnsignedBurningPsbt(tx.toHex(), address, feeRate, rbf);
  burningPsbt.signInput(0, staker_keyPair);
  burningPsbt.signInput(0, protocol_keyPair);
  burningPsbt.finalizeInput(0, burningFinalizer);
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

async function slashingOrLostKey(
  tx: bitcoin.Transaction,
  option: string = "test"
) {
  // SETUP leaves
  const tapLeaves = (await staker.getStaker()).getTapLeavesScript();
  //////////////////////////// Slashing ////////////////////////////
  const slashingOrLostKeyLeaf = (await tapLeaves).slashingOrLostKeyLeaf;
  const slashingFinalizer = (_inputIndex: number, input: PsbtInput) => {
    const empty_vector = Buffer.from([]);
    const scriptSolution = [
      input.tapScriptSig![6].signature,
      input.tapScriptSig![5].signature,
      // input.tapScriptSig![4].signature,
      input.tapScriptSig![3].signature,
      empty_vector,
      input.tapScriptSig![2].signature,
      empty_vector,
      input.tapScriptSig![1].signature,
      input.tapScriptSig![0].signature,
    ];
    const witness = scriptSolution
      .concat(slashingOrLostKeyLeaf.script)
      .concat(slashingOrLostKeyLeaf.controlBlock);
    return {
      finalScriptWitness: witnessStackToScriptWitness(witness),
    };
  };

  const { psbt: slashingOrLostKeyPsbt, feeEstimate: fee } =
    await staker.getUnsignedSlashingOrLostKeyPsbt(
      tx.toHex(),
      address,
      feeRate,
      rbf
    );

  slashingOrLostKeyPsbt.signInput(0, staker_keyPair);
  slashingOrLostKeyPsbt.signInput(0, protocol_keyPair);
  slashingOrLostKeyPsbt.signInput(0, sortedCovenants[0]);
  slashingOrLostKeyPsbt.signInput(0, sortedCovenants[1]);
  slashingOrLostKeyPsbt.signInput(0, sortedCovenants[2]);
  slashingOrLostKeyPsbt.signInput(0, sortedCovenants[3]);
  slashingOrLostKeyPsbt.signInput(0, sortedCovenants[4]);
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

async function burnWithoutDApp(
  tx: bitcoin.Transaction,
  option: string = "test"
) {
  // SETUP leaves
  const tapLeaves = (await staker.getStaker()).getTapLeavesScript();
  //////////////////////////// Burning Without DApp ////////////////////////////
  const burnWithoutDAppLeaf = (await tapLeaves).burnWithoutDAppLeaf;
  const burnWithoutDAppFinalizer = (_inputIndex: number, input: PsbtInput) => {
    const empty_vector = Buffer.from([]);
    const scriptSolution = [
      // input.tapScriptSig![5].signature,
      empty_vector,
      input.tapScriptSig![4].signature,
      // input.tapScriptSig![3].signature,
      empty_vector,
      input.tapScriptSig![2].signature,
      input.tapScriptSig![1].signature,
      input.tapScriptSig![0].signature,
    ];
    const witness = scriptSolution
      .concat(burnWithoutDAppLeaf.script)
      .concat(burnWithoutDAppLeaf.controlBlock);
    return {
      finalScriptWitness: witnessStackToScriptWitness(witness),
    };
  };

  const { psbt: burnWithoutDAppPsbt, feeEstimate: fee } =
    await staker.getUnsignedBurnWithoutDAppPsbt(
      tx.toHex(),
      address,
      feeRate,
      rbf
    );
  burnWithoutDAppPsbt.signInput(0, staker_keyPair);
  burnWithoutDAppPsbt.signInput(0, sortedCovenants[0]);
  burnWithoutDAppPsbt.signInput(0, sortedCovenants[1]);
  burnWithoutDAppPsbt.signInput(0, sortedCovenants[2]);
  burnWithoutDAppPsbt.signInput(0, sortedCovenants[3]);
  burnWithoutDAppPsbt.signInput(0, sortedCovenants[4]);
  burnWithoutDAppPsbt.finalizeInput(0, burnWithoutDAppFinalizer);
  const burnWithoutDAppTx = burnWithoutDAppPsbt.extractTransaction(true);
  console.log(fee);
  console.log(burnWithoutDAppTx.virtualSize());
  if (option === "test") {
    API(process.env.url!, "testmempoolaccept", [[burnWithoutDAppTx.toHex()]]); // Enable if want to push
  } else if (option === "send") {
    API(process.env.url!, "sendrawtransaction", [burnWithoutDAppTx.toHex()]); // Enable if want to push
  } else {
    console.log("Invalid option");
  }
}

const tx = bitcoin.Transaction.fromHex(
  "020000000001022f2c7cb9dcfe3e94e2605c352b8319645dfeb6b32e35292e3f70d1aecf6dc4b80000000000fdffffff5f9852c87408fa37d6ebb9b0c0f67885ef0a1f076c2cf91ab2e85ab489c3caf50300000000fdffffff041027000000000000225120a86f9f7e22896fe90f4798192728a60583b6ded005e44b4fb1c64f50c5a65ec60000000000000000476a4501020304302b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d0000000000000000536a4c5000000000000000016bb9f03858c8ed34cb6ceb2bb26b17da80bc512cb5065df90c390a7c5318f822b0fa96cde2f330511000000000000000000000000000000000000000000000000000000000000000171c0e000000000016001408b7b00b0f720cf5cc3e7e38aaae1a572b962b240247304402206fb2eb98d9ecfc3906ff26887309b3fbb48181034135e286bef102b99fcc732e022022b4d50b14219540e48e1c1f5763748aac654913bc70e54a0e8add9e73eea5590121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d02483045022100bb5a6711d748dd2b37ea6b42b10f3e9eb87d24d868336d145e00c33fd7ed734f02203642474a4edac7e2f4cad7f66ac16ea296b575c127d0aef6c61a81a8e3c58c770121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d00000000"
);
vault("send");
// burning(tx,"send");
// slashingOrLostKey(tx);
// burnWithoutDApp(tx,"send")
