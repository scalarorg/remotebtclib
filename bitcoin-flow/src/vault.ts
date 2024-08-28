import dotenv from "dotenv";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

import * as vault from "../../vault/src/index";

import { globalNetworkType, globalParams } from "./global-params";
import * as utils from "./utils";

dotenv.config({ path: "../.env" });
const ECPair = ECPairFactory(ecc);

// Prepare for service simulation
const service = ECPair.fromWIF(process.env.serviceWIF!, globalNetworkType);

// First flow
// for create vault transaction and send to bitcoin network
async function vaultFlow() {
  // this information : address + publickey, provided by the user - UNISAT API supports this
  // Can find it in : https://demo.unisat.io/
  const stakerAddress: string = "tb1qpzmmqzc0wgx0tnp70cu24ts62u4ev2ey8xlgn3";
  const stakerPublicKey: string =
    "032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d";
  // servicePubkey provided by the service
  const servicePublicKey: string = service.publicKey.toString("hex");
  // globalParams provided by the Scalar
  // information to ETH chain, provided by user, Scalar service will help user to make this
  const chainID = "aa36a7"; // Sepolia chain ID
  const chainIdUserAddress = "130C4810D57140e1E62967cBF742CaEaE91b6ecE";
  const chainSmartContractAddress = "768E8De8cf0c7747D41f75F83C914a19C5921Cf3";
  const mintingAmount = 10000; // in satoshis
  const staker = new vault.Staker(
    stakerAddress,
    stakerPublicKey,
    servicePublicKey,
    globalParams.covPublicKeys,
    globalParams.quorum,
    globalParams.tag,
    globalParams.version,
    chainID,
    chainIdUserAddress,
    chainSmartContractAddress,
    mintingAmount,
  );
  const regularUTXOs: vault.UTXO[] = await vault.getUTXOs(stakerAddress); // Mempool call api
  const stakingAmount = 10000; // in statoshis
  const feeRate = (await utils.mempool.getFeesRecommended("testnet"))
    .fastestFee; // Get this from Mempool API
  const rbf = true; // Replace by fee, need to be true if we want to replace the transaction when the fee is low
  const { psbt: unsignedVaultPsbt, feeEstimate: fee } =
    await staker.getUnsignedVaultPsbt(
      regularUTXOs,
      stakingAmount,
      feeRate,
      rbf,
    );
  // Simulate signing
  const signedPsbt = await utils.psbt.signPsbt(
    process.env.stakerWIF!,
    unsignedVaultPsbt.toBase64(),
    true,
  );
  // --- Sign with staker
  const hexTxfromPsbt = signedPsbt.extractTransaction().toHex();

  console.log("fee: ", fee);
  console.log(hexTxfromPsbt); // log it for the unbonding.ts

  // UNISAT have api for user to sign this psbt and finalize it
  // this demo: https://demo.unisat.io/
  // It support sign psbt, push psbt or push tx to bitcoin network

  // --- Send to bitcoin network

  // await utils.node.testMempoolAcceptance(process.env.url!, hexTxfromPsbt); // enalbe this line to test mempool acceptance
  await utils.node.sendToBitcoinNetwork(process.env.url!, hexTxfromPsbt); // enalbe this line to send to bitcoin network
}
vaultFlow();
