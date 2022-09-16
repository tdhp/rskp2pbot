- [Create Sell Order](https://github.com/lnp2pBot/bot#creating-a-sell-order)
- [Create Buy Order](https://github.com/lnp2pBot/bot#creating-a-buy-order)
- Set Lightning Address so that bot can create your invoices for you.

# Possible Use Cases

Illustrated using [Mermaid](https://mermaid-js.github.io/mermaid-live-editor)

## Bob Creates Sell Order
```mermaid
sequenceDiagram
    sequenceDiagram
    participant Bob
    participant Bot🤖
    Bob->>+Bot🤖: /sell
    Bot🤖->>+Bob: What fiat currency?
    Bob-->>-Bot🤖: Currency code
    Bot🤖->>+Bob: How many fiat?
    Bob-->>-Bot🤖: N fiat
    Bot🤖->>+Bob: How many sats?
    Note right of Bot🤖: Using Yodex API, <br/> the bot can compute the <br/>corresponding number of Sats.
    Bob-->>-Bot🤖: Y sats OR Market price
    Note right of Bot🤖: Create Order X in DB<br/> and Publish in Channel
    Bot🤖-->>-Bob: Order Id X
    Note right of Alice: Alice sees Order X, <br/> she tells the bot that <br/> she will take it.
    Alice->>+Bot🤖: /takebuy
    Bot🤖->>+Alice: Are you sure? 
    Alice->>-Bot🤖: Yes, Continue
    Bot🤖->>+Alice: Where should I send the Sats? 
    Alice->>-Bot🤖: At this Invoice Id $1.
    Bot🤖->>-Alice: Waiting for Bob Payment 
    Note right of Bot🤖: Bot creates a hold invoice $2
    Bot🤖->>Bob: Can you send the Y Sats at the hold Invoice $2?
    Note right of Bot🤖:  Description of the hold invoice: <br/>"Escrow amount Order 630a833cf2327decb4531897:<br/> SELL BTC for USD 20 - It WILL FREEZE IN WALLET.<br/> It will release once you run /release. <br/>It will return if buyer does not confirm the payment"
    Note left of Bob: Bob uses his lightning <br/>wallet to pay Invoice $2.
    Bot🤖->>Alice: Contact Bob in order to know<br/> how send him the Fiat payment.
    Bot🤖->>Bob: Contact Alice in order to tell<br/> how do you want to be paid in Fiat.
    Bob->>+Alice: Send me the fiat payment like this.
    Alice-->>-Bob: I have sent you the payment.
    Note left of Bob: Bob receives the fiat payment.
    Bob->>Bot🤖: /release the Sats in <br/>hold invoice $2 of order X
    Bot🤖->>Alice: Sats were sent to the invoice $1.
```

- No held invoice
