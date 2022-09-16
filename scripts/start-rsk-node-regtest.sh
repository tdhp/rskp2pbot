docker ps -f name=rsk-node-regtest | xargs docker rm
docker run \
  -p 5051:5051 \
  -p 127.0.0.1:4454:4454 \
  --name rsk-node-regtest \
  -v /Users/hamadycisse/.rsk/docker/regtest:/etc/rsk \
  rsksmart/rskj:latest --regtest &
