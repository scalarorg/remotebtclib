export interface UTXO {
  txid: string;
  vout: number;
  status?: status;
  value: number;
}

export interface status {
  confirmed: boolean;
  block_height: number;
  block_hash: string;
  block_time: number;
}

export interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
  disableTweakSigner?: boolean;
}
