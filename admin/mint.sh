#!/bin/bash
INPUT=$1

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName 487964726120446F6F6D20546F75726E616D656E74202D2031737420506C6163652054726F706879 --amount 25000 --outputAddress [REFEREE ADDRESS] | tail -n 1)

echo "Asset 1 completed. Please wait until you see confirmation on chain, then hit Enter to continue"
read

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName 487964726120446F6F6D20546F75726E616D656E74202D20326E6420506C6163652054726F706879 --amount 10000 --outputAddress [REFEREE ADDRESS] | tail -n 1)

echo "Asset 2 completed. Please wait until you see confirmation on chain, then hit Enter to continue"
read

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName 487964726120446F6F6D20546F75726E616D656E74202D2033726420506C6163652054726F706879 --amount 5000 --outputAddress [REFEREE ADDRESS] | tail -n 1)

echo "Asset 3 completed. Please wait until you see confirmation on chain, then hit Enter to continue"
read

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName 487964726120446F6F6D20546F75726E616D656E74202D2034746820506C6163652054726F706879 --amount 5000 --outputAddress [REFEREE ADDRESS] | tail -n 1)
read

echo "All assets minted and sent to referee address"
