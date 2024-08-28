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

  const result = await axios
    .post(url, data, config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      if (error.response) {
        return error.response;
      } else {
        return error;
      }
    });

  return result;
}

export async function testMempoolAcceptance(url: string, tx: string) {
  return await API(url, "testmempoolaccept", [[tx]]);
}

export async function sendToBitcoinNetwork(url: string, tx: string) {
  return await API(url, "sendrawtransaction", [tx]);
}
