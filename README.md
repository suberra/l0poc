# POC with LayerZero

INFO: This is a POC.

POC on cross-chain subscriptions with LayerZero. Merchants can base their subscriptions on base chains, and users can pay from any chains (the remote chains) that they have funds on.

Terminlogy:
* Base Chain: Where the main product NFT will be hosted. 
* Remote Chain: Where users can pay from.

On remote contract: 
1. User provides approvals to periodic allowance contract, which enforces the contract to withdraw up to x amount of tokens every billing cycle (i.e. 50 USDC every month)
2. On subscribe, the first payment will be transferred to the receiver address
3. An instruction to mint NFT will be sent to the layerzero endpoints

The communication from remote and base will be done through LayerZero protocol before it is sent to the base chain:
1. The LzEndpiint on base chain will receive the payload from LZ's relayer
2. A NFT will be minted with the correct time expiry.

# To be done: 
* Connecting to periodic allowance - currently developed as a standalone with unit-tests, need to be integrated.
* Time-expiry NFT
* Charges and renewals

# Issues to think through
* How to handle state changes from the base contracts. 
* Handling UX experience from frontend (current user have to wait for a long time for NFT to be minted)\
* Better way to manage signing with permits
* Admin Controls


# Install & Run tests

```bash
yarn install
npx hardhat test 
```

# License
MIT