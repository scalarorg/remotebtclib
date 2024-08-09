# remotebtclib

Push vault transaction:
Go to /Users/hoang/Desktop/dAppProject/remotebtclib/lib/vault/src/tests/demo_test.ts

At line 57 to 60: 
 + change value if you want
 + the minting amount must be less than staking amount
Change staking amount at line 84 if u want

At line 266 to the end:
If you want to test transaction, use "test" or nothing option in function like:
    + vault() or vault("test")
If you want to send to BTC network, use vault("send")

How to run:
At that demo_test.ts file do:
    ts-node demo_test.ts
