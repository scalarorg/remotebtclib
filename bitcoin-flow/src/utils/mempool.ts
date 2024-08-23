import mempoolJS from "@mempool/mempool.js";
import { FeesRecommended } from "@mempool/mempool.js/lib/interfaces/bitcoin/fees";

export async function getFeesRecommended(): Promise<FeesRecommended> {
  const {
    bitcoin: { fees },
  } = mempoolJS({
    hostname: "mempool.space",
    network: "testnet",
  });

  const feesRecommended: FeesRecommended = await fees.getFeesRecommended();
  return feesRecommended;
}
