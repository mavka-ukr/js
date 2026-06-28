#!/bin/sh
set -x
set -e

rm -rf buildforpublish
npm run buildforpublish:src
npm run buildforpublish:bin
cp -a README.md package.json package-lock.json wasm buildforpublish
cd buildforpublish
npm pub

npm run dist