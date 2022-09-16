[![MIT license](https://img.shields.io/badge/license-MIT-brightgreen)](./LICENSE)
# P2PRSKBot [demo video](https://we.tl/t-zd4DYvH5Zv)
Telegram bot [bot](https://t.me/rskp2pbot_testnet) that allows people to trade using lightning network with other people on telegram, this is an open source project and anyone can create issues, submit a PR, fork it, modify it or create their own bot with the code.

## Try it out!
* Website: **TODO**
* Bot: **TODO**
* Main channel offers: **TODO**

Wherever you are you can start using the [bot](https://t.me/rskp2pbot_testnet), just need to have a telegram account with a username and `/start` the bot.

---

**rskp2pbot** is being developed on nodejs and connects with an RSK ecosystem.
Escrow accounts are used to receive the RBTC from the seller and are thereafter used to transfer the RBTC to the buyer once the confirmation is given by both parties.

## Creating a sell order
1. Alice tells to the bot that she wants to sell 5000 sats for **n** fiat amount.
2. The bot publishes a sell order of 5000 sats on the bot channel.
3. Bob accepts the order for 5000 sats sending a payout RSK address to the bot.
4. The bot send to alice a deposit escrow account address, Alice has to send the exact amount (+fees) at that address. Event if the money is in the escrow account, the seller can be reimbursed to same amount (minus gas fees) if the order is cooperatively canceled.
5. After the bot detects that Alice deposited the exact amount, the bot puts Alicia in contact with Bob.
6. Bob sends the fiat money to Alice and tells to the bot that the fiat money was sent to Alice.
7. When Alice confirmed that she received the money, the bot transfer the deposited funds to Bob's payout address.
8. If Alice does not confirm the operation that she received the payment in certain amount of time (initially we set this in two hours but this can be changed), the bot will send all the information to one admin and the admin will solve the issue, before the time expires Bob will be notified that Alice is not responding and Bob can start a dispute.

## Creating a buy order
1. Alice wants to buy 5000 sats.
2. Alice publishes a buy order of 5000 sats with **n** fiat amount, Alice does not have satoshis, but she has fiat.
3. The bot shows the order in the public group.
4. Bob takes the order, the bot sends him a deposit escrow account address where he should send exactly 5000.
5. Bob sends the funds.
6. The bot tells Alice that Bob has already made the deposit, Alice now have to send a payout address to the bot to receive her satoshis. She can now send the fiat to Bob, after she sent the money she tells to the bot that the fiat was sent.
7. When Bob confirms that he received the fiat, the bot transfers the funds from the escrow account to Alice's payout address.
8. If Bob does not confirm the operation that he received the payment in certain amount of time (initially we set this in two hours but this can be changed), the bot will send all the information to one admin and the admin will solve the issue, before the time expires Alice will be notified that Bob is not responding and Alice can start a dispute.

## Cooperative cancel
After a user creates a new order and before another user take it, the user can cancel the order, but in some cases users may need to cancel the order, it shouldn't be unilateral.

Only if both parties cancel cooperatively the order is canceled and seller's funds are returned.

If users have a disagreement on canceling or don't want to go forward they can start a dispute.

## Disputes
Both parties can start a dispute at any moment, after a dispute is started a human will be notified with all the information, this human will contact both parties to evaluate the situation and take a decision.

After a user starts a dispute, both parties will have increased by **1** their own `dispute` field in database and after **2** disputes users will be banned from using the bot.

## Incentive to release funds
A seller that didn't release funds to the buyer can't open or take another order from the bot and probably will be involved in a dispute from the buyer damaging his/her reputation

# Financial Support
**p2prskbot** is an open source project. We are not a company, we don't do ICOs or dark business, we are just people that wants bring solutions to the people using the best open source money in the world. Our work depends on the financial collaboration of the users.

# Installation
You will need to create an `.env` file on the root dir, you can use a sample env file called `.env.sample` on the root dir, an easy way of doing this is just to copy the sample file to `.env`.

```
cp .env-sample .env
```

## MongoDB
You will need to have [mongo](https://www.mongodb.com) installed and fill the mongo variables on the .env file, those that stats with `DB_`.

## Telegram
You will need a telegram bot api key (`BOT_TOKEN`), find out more about it [here](https://core.telegram.org/bots/).

## Tor service or another proxy
You can route the bot API via Tor service or another proxy if you specify 'SOCKS_PROXY_HOST' parameter in .env. For Ubuntu see [this](https://www.linuxuprising.com/2018/10/how-to-install-and-use-tor-as-proxy-in.html)

## RSK Chain
You will need connect to the RSK public testnet or mainnet

To install just run:
```
$ cd rskp2pbot
$ npm install
```
[Here](docs/INSTALL.md#installation) we have a detailed guide for installation and first steps using the bot.
# Running it
```
$ npm start
```
# Testing
```
$ npm test
```
# Documentation
You can find documentation **TODO**

# Contribute

See [contributing guide](CONTRIBUTING.md).
