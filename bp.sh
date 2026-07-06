#!/bin/sh
set -x
set -e

bash b.sh
cd buildforpublish
npm pub

cd -

rm -rf dist
npm run dist