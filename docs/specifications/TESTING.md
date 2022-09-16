## Testing
- Start docker using script ./scripts/start-rsk-node-regtest.sh
- Check the balance of the default account `0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826`, it should be `1000000000000000000000000000000` weis.
- Open a node REPL console: `node`
- Import rsk3: `const Rsk3 = require('@rsksmart/rsk3')`
- Initialize rsk3 client: `var rsk3 = new Rsk3('$HOST', null, {})`
- Create an account for buyer and note down its address and private keys: `var buyerAccount = rsk3.accounts.create(rsk3.utils.randomHex(32).toString('hex'))`
- Add buyer account to wallet: `rsk3.accounts.wallet.add(buyerAccount)`
- Create an account for seller and note down its address and private keys: `var sellerAccount = rsk3.accounts.create(rsk3.utils.randomHex(32).toString('hex'))`
- Add seller account to wallet: `rsk3.accounts.wallet.add(sellerAccount)`
- Fund the seller account
  - If you are on RegTest, Transfer some weis to from the default account to the seller account: 
```javascript
await rsk3
  .sendTransaction({ 
    to: '$SELLER_ADDRESS',
    value: '10000000000000000000000000000', 
    gas: '21000', 
    from:'0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826', 
    chainId: '$RSK_CHAIN_NETWORK_ID'
  })
```
-
  - If you are on Testnet, use the seller public address [here](https://faucet.rsk.co/)
- Check seller's account balance: `rsk3.getBalance({SELLER_ADDRESS})` in order to ensure that the weis were transferred.
- Create an Sell Order by sending the command /sell to the bot
- From another telegram user, take the sell order and send the bot the address of the `buyerAccount`
- The bot will generate a new escrow account and send it to the seller
- Using the rsk3 client to send a transaction 
```javascript
await rsk3
  .sendTransaction({ 
    to: '$ESCROW_DEPOSIT_ADDRESS',
    value: '$THE_QUANTITY_OF_SATS_MULTIPLIED_BY_10_000_000',
    from: '$SELLER_ADDRESS',
    gas:'21000', 
    chainId: '$RSK_CHAIN_NETWORK_ID', 
    nonce: '123'
  }, '$SELLER_PRIVATE_KEY')
```
## Info
Unit systems
50,000,000,000 `wei` = 5 x 10<sup>10</sup> `wei` = 0.00000005 `RBTC` = 0.00000005 `ether` = 5 `sats`

### Development

This bot uses `schedule.scheduleJob` which spawns node processes which must be killed in order for code changes to take effect.
