// non inscription UTXO
export interface nonInscriptionUTXO {
  address: string;
  inscriptions: [
    {
      inscriptionId: string;
      isBRC20: boolean;
      moved: boolean;
    }
  ];
  isOpInRBF: boolean;
  satoshi: number;
  scriptPk: string;
  scriptType: string;
  txid: string;
}
