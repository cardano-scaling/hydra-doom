#!/bin/bash
INPUT=$1

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName [FIRST PLACE TOKEN NAME] --amount 25000 --outputAddress [REFEREE ADDRESS] | tail -n 1)

echo "Asset 1 completed. Waiting 20 seconds before starting next mint..."

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName [SECOND PLACE TOKEN NAME] --amount 10000 --outputAddress [REFEREE ADDRESS] | tail -n 1)

echo "Asset 2 completed. Waiting 20 seconds before starting next mint..."

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName [THIRD PLACE TOKEN NAME] --amount 5000 --outputAddress [REFEREE ADDRESS] | tail -n 1)

echo "Asset 3 completed. Waiting 20 seconds before starting next mint..."

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName [FOURTH PLACE TOKEN NAME] --amount 5000 --outputAddress [REFEREE ADDRESS] | tail -n 1)

echo "All assets minted and sent to referee address"
