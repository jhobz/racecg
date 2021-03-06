#!/bin/bash
# Deploy script ran by Travis after successful builds on master
set -x

RED='\033[0;31m'
NC='\033[0m'

ssh $REMOTE_USER@$REMOTE_HOST << EOF
if ! cd ~/nodecg/bundles/racecg ; then
	echo -e "${RED}Failed to locate directory racecg. Are you sure you're the right user?${NC}"
	exit 1
fi

git fetch origin master && \
git reset --hard origin/master && \
npm i --production && \
npm run build && \
pm2 restart NodeCG
exit
EOF