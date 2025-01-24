#!usr/bin/env bash
INPUT=$1

set -e

INPUT=$(npx tsx src/mint-token.ts --input $INPUT --tokenName 487964726120446F6F6D202D2031737420506C6163652054726F706879 --amount 4 | tail -n 1)

echo "Asset 1 completed. Please wait until you see confirmation on chain, then hit Enter to continue"
read

INPUT=$(npx tsx src/mint-token.ts --input $INPUT#2 --tokenName 487964726120446F6F6D202D20326E6420506C6163652054726F706879 --amount 3 | tail -n 1)

echo "Asset 2 completed. Please wait until you see confirmation on chain, then hit Enter to continue"
read

INPUT=$(npx tsx src/mint-token.ts --input $INPUT#2 --tokenName 487964726120446F6F6D202D2033726420506C6163652054726F706879 --amount 2 | tail -n 1)

echo "Asset 3 completed. Please wait until you see confirmation on chain, then hit Enter to continue"
read

INPUT=$(npx tsx src/mint-token.ts --input $INPUT#2 --tokenName 487964726120446F6F6D202D2034746820506C6163652054726F706879 --amount 1 | tail -n 1)

echo "All assets minted and sent to referee address"
