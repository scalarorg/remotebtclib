# Note for unisat signing

Follow to this https://demo.unisat.io :
1. Signing psbt : unisat.signPsbt(psbtHex[, options])
    + necessary options for sign taproot address:
        - autoFinalized: false 
        - index: 0
        - publicKey (or address of staker)
        - disableTweakSigner: false/true (i don't remember :D, just try until we can sign)