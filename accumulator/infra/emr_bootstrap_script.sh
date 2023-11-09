#!/bin/bash

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 17
nvm alias default 17

sudo ln -s "$(which node)" /usr/bin/node
sudo ln -s "$(which npm)" /usr/bin/npm
sudo ln -sf "$(npm root --quiet -g)" "$(dirname $(npm root --quiet -g))/node"

export NODE_PATH=$(npm root --quiet -g)
# export NODE_OPTIONS="--max-old-space-size=2048"


ls $NODE_PATH

npm i -g o1js@^0.14.1

ls $NODE_PATH
