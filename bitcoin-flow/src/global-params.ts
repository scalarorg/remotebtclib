import * as bitcoin from "bitcoinjs-lib";
import dotenv from "dotenv";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
dotenv.config({ path: "../.env" });

const ECPair = ECPairFactory(ecc);

// don't matter what network we use,
// it just a encode/decode for realize the transaction in which network
export const globalNetworkType = bitcoin.networks.testnet;

// Create global-params.json
const number_of_covenants = 5;
const covenant_keyPairs = [];
for (let i = 1; i <= number_of_covenants; i++) {
  covenant_keyPairs.push(
    ECPair.fromWIF(process.env[`covenant${i}WIF`]!, globalNetworkType),
  );
}
const quorum = 3;
const tag = "01020304";
const version = 0;

export const globalParams = {
  covKeyPairs: covenant_keyPairs,
  covPublicKeys: covenant_keyPairs.map((c) => c.publicKey.toString("hex")),
  quorum,
  tag,
  version,
};
