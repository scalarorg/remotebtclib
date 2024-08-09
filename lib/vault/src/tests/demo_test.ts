import { Staker, UnStaker } from "..";
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

const chainID = "aa36a7";
const chainIdUserAddress = "130C4810D57140e1E62967cBF742CaEaE91b6ecE";
const chainSmartContractAddress = "768E8De8cf0c7747D41f75F83C914a19C5921Cf3";
const mintingAmount = 10000; // in satoshis
 
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

async function burning(tx: string, option: string = "test") {
  const unStaker = new UnStaker(
    address,
    tx,
    covenants_keyPairs.map((c) => c.publicKey.toString("hex")),
    qorum
  );
  //////////////////////////// Burning ////////////////////////////
  const {
    psbt: burningPsbt,
    feeEstimate: fee,
    burningLeaf,
  } = await unStaker.getUnsignedBurningPsbt(address, feeRate, rbf);
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

  burningPsbt.signInput(0, staker_keyPair);
  const staker_signature = burningPsbt.data.inputs[0].tapScriptSig![0].signature;
  console.log(staker_signature.toString("hex"));
  // burningPsbt.signInput(0, protocol_keyPair);
  burningPsbt.finalizeInput(0);
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
  const unStaker = new UnStaker(
    address,
    tx,
    covenants_keyPairs.map((c) => c.publicKey.toString("hex")),
    qorum
  );
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

async function burnWithoutDApp(tx: string, option: string = "test") {
  const unStaker = new UnStaker(
    address,
    tx,
    covenants_keyPairs.map((c) => c.publicKey.toString("hex")),
    qorum
  );
  // SETUP leaves
  //////////////////////////// Burning Without DApp ////////////////////////////
  const {
    psbt: burnWithoutDAppPsbt,
    feeEstimate: fee,
    BWoD,
  } = await unStaker.getUnsignedBurnWithoutDAppPsbt(address, feeRate, rbf);
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
      .concat(BWoD.script)
      .concat(BWoD.controlBlock);
    return {
      finalScriptWitness: witnessStackToScriptWitness(witness),
    };
  };

  burnWithoutDAppPsbt.signInput(0, staker_keyPair);
  const staker_signature = burnWithoutDAppPsbt.data.inputs[0].tapScriptSig![0].signature;
  console.log(staker_signature.toString("hex"));
  // burnWithoutDAppPsbt.signInput(0, sortedCovenants[0]);
  // burnWithoutDAppPsbt.signInput(0, sortedCovenants[1]);
  // burnWithoutDAppPsbt.signInput(0, sortedCovenants[2]);
  // burnWithoutDAppPsbt.signInput(0, sortedCovenants[3]);
  // burnWithoutDAppPsbt.signInput(0, sortedCovenants[4]);
  burnWithoutDAppPsbt.finalizeInput(0);
  const burnWithoutDAppTx = burnWithoutDAppPsbt.extractTransaction(true);
  console.log(burnWithoutDAppTx.toHex());
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

const tx =
  "020000000001015ac71b7bf22c8d46dec05f587ba0e1721e7a59a9d0f2610e577fadf4ea3ee7040300000000fdffffff0410270000000000002251207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be910000000000000000476a4501020304002b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d00000000000000003a6a3800000000000000016bb9f03858c8ed34cb6ceb2bb26b17da80bc512cb5065df90c390a7c5318f822b0fa96cde2f3305100000000000003e805040c000000000016001408b7b00b0f720cf5cc3e7e38aaae1a572b962b2402473044022060b86ad465133d0ff6141d65b783b7162b83234f13c1f383a492f79cc78fc11102205981dedab6a8aadfea27fafb29cc1f506fb50690c6e39af855f97732f2acb22e0121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d00000000";
vault();
// burning(tx);
// slashingOrLostKey(tx);
// burnWithoutDApp(tx);
