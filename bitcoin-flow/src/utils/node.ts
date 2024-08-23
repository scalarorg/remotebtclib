import axios from "axios";

async function API(url: string, method: string, params: any) {
  const data = {
    jsonrpc: "1.0",
    id: "curltest",
    method: method,
    params: params,
  };

  const config = {
    auth: {
      username: process.env.user!,
      password: process.env.pass!,
    },
    headers: {
      "Content-Type": "text/plain",
    },
  };

  axios
    .post(url, data, config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      if (error.response) {
        console.log(error.response);
        console.log("Status:", error.response.status);
      } else {
        console.log(error);
      }
    });
}

export async function testMempoolAcceptance(url: string, tx: string) {
  await API(url, "testmempoolaccept", [[tx]]);
}

export async function sendToBitcoinNetwork(url: string, tx: string) {
  await API(url, "sendrawtransaction", [tx]);
}