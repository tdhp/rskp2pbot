- Start LND Docker: https://docs.zaphq.io/docs-ios-docker-node-setup#debug
- `sudo docker run -p 10009:10009 -p 9735:9735 --name=lnd-node -v /Users/hamadycisse/.lnd:/lnd/.lnd lnzap/lnd:latest --bitcoin.active --bitcoin.testnet --bitcoin.node=neutrino --neutrino.connect=faucet.lightning.community --routing.assumechanvalid --neutrino.addpeer=btcd-testnet.lightning.computer --rpclisten=0.0.0.0:10009 --debuglevel=info --autopilot.active --externalip=127.0.0.1:10009`
- Generate base64 using : ` openssl enc -A -a <<< XXXX`
- Obtain admin.macaroon using: `sudo docker exec -u lnd -it lnd_node cat /lnd/.lnd/data/chain/bitcoin/testnet/admin.macaroon > admin.macaroon && openssl enc -base64 <<< $(cat admin.macaroon) `
- Start Mongo: `docker run -d -p 27017:27017 --name mongo-rsk \
  -e MONGO_INITDB_ROOT_USERNAME=mongoadmin \
  -e MONGO_INITDB_ROOT_PASSWORD=rskp2pbot \
  -e MONGO_INITDB_DATABASE=p2prskbot \
  mongo`
