import * as utils from "./utils";
import { globalParams } from "./global-params";

import dotenv from "dotenv";
import {
  unbondingService,
  unbondingCovenants,
  unbondingPresigned,
} from "./unbonding-flow";
dotenv.config({ path: "../.env" });

// flow unbonding
// this flow have 3 case:
// + case 1: unbonding with Service
// + case 2: unbonding with Scalar's covenants

// + case 3: presigned unbonding
// this is special case, user need to create unbonding transaction first
// then send to Scalar
// Scalar will send to Service and Scalar's covenants to sign it
// when all sign, Scalar will send to bitcoin network

async function unbondingFlow() {
  const stakerAddress: string = "tb1qpzmmqzc0wgx0tnp70cu24ts62u4ev2ey8xlgn3";
  const hexVaultTx: string =
    "0200000000010213792d431f6dd7346763e75c37fe3bcdaf9c1e7720f7491d911f436647f1cb160000000000fdffffff7a49f915703c56af055e1b594810555175c0d7415ba9aed1282746ec79d6a1670300000000fdffffff0410270000000000002251207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be910000000000000000476a4501020304002b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d00000000000000003a6a380000000000aa36a7130c4810d57140e1e62967cbf742caeae91b6ece768e8de8cf0c7747d41f75f83c914a19c5921cf30000000000002710c9d30d000000000016001408b7b00b0f720cf5cc3e7e38aaae1a572b962b2402483045022100bc2af99eb0cc5e2417fcbf068e8839653fceeee5b2c01191f9a673b3574f9f1a0220698eb81702e2846dfdf606647000e53634c46d625249925fce88b3c420390e150121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d02473044022006c31d83c51ffcbe00e0dc88e51690c10f15a4c87ff4a3723356a081febf7463022055e9190b24c46ec817fffa724a25922700eb9cefadaa9d0b5f8a2a5727c5db8f0121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d00000000";
  const receiveAddress: string = "tb1qpzmmqzc0wgx0tnp70cu24ts62u4ev2ey8xlgn3";
  // const feeRate: number = (await utils.mempool.getFeesRecommended()).fastestFee; // Get this from Mempool API
  const feeRate: number = 1 // enalbe this when REAL fee too hight, just use for test
  const rbf: boolean = true; // Replace by fee, need to be true if we want to replace the transaction when the fee is low

  async function serviceFlow() {
    const { hexTxfromPsbt, fee } = await unbondingService(
      stakerAddress,
      hexVaultTx,
      globalParams.covPublicKeys,
      globalParams.quorum,
      receiveAddress,
      feeRate,
      rbf
    );
    return { hexTxfromPsbt, fee };
  }

  async function covenantsFlow() {
    const { hexTxfromPsbt, fee } = await unbondingCovenants(
      stakerAddress,
      hexVaultTx,
      globalParams.covPublicKeys,
      globalParams.quorum,
      receiveAddress,
      feeRate,
      rbf
    );
    return { hexTxfromPsbt, fee };
  }

  async function presignedFlow() {
    const { hexTxfromPsbt, fee } = await unbondingPresigned(
      stakerAddress,
      hexVaultTx,
      globalParams.covPublicKeys,
      globalParams.quorum,
      receiveAddress,
      feeRate,
      rbf
    );
    return { hexTxfromPsbt, fee };
  }

  const { hexTxfromPsbt, fee } = await serviceFlow(); // enalbe this line to test service

  // const { hexTxfromPsbt, fee } = await covenantsFlow(); // enalbe this line to test covenants

  // const { hexTxfromPsbt, fee } = await presignedFlow(); // enalbe this line to test presigned

  await utils.node.testMempoolAcceptance(process.env.url!, hexTxfromPsbt); // enalbe this line to test mempool acceptance
  // await utils.node.sendToBitcoinNetwork(process.env.url!, hexTxfromPsbt); // enalbe this line to send to bitcoin network
}

unbondingFlow();
