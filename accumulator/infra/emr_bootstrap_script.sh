#!/bin/bash

# install Node.js and Snarkyjs as a global package
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 17
nvm alias default 17

sudo ln -s "$(which node)" /usr/bin/node
sudo ln -s "$(which npm)" /usr/bin/npm
sudo ln -sf "$(npm root --quiet -g)" "$(dirname $(npm root --quiet -g))/node"

export NODE_PATH=$(npm root --quiet -g)


ls $NODE_PATH

npm i -g snarkyjs

ls $NODE_PATH

# install and setup NUMA
sudo yum -y install numactl
echo 1 | sudo tee /proc/sys/kernel/numa_balancing

sudo echo "banned.users=mapred,bin,hdfs" >> /etc/hadoop/conf/container-executor.cfg
sudo rm -rf /var/log/hadoop-yarn/ 
sudo chown -R yarn:hadoop /var/log/hadoop-yarn/
sudo chmod 755 -R /var/log/hadoop-yarn/

sudo chmod 6050 /etc/hadoop/conf/container-executor.cfg

mkdir /mnt/yarn && sudo chmod 755 -R /mnt/yarn && sudo chown -R yarn:hadoop /mnt/yarn
mkdir /mnt1/yarn && sudo chmod 755 -R /mnt1/yarn && sudo chown -R yarn:hadoop /mnt1/yarn
mkdir /mnt2/yarn && sudo chmod 755 -R /mnt2/yarn && sudo chown -R yarn:hadoop /mnt2/yarn
