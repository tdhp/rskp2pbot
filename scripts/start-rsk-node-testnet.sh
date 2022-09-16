docker ps -f name=rsk-node | xargs docker rm
docker run \
  -p 5050:5050 \
  -p 127.0.0.1:4444:4444 \
  --name rsk-node \
  -v /Users/hamadycisse/.rsk:/var/lib/rsk/.rsk \
  -v /Users/hamadycisse/.rsk/docker/regtest:/etc/rsk \
  rsksmart/rskj:latest --testnet
