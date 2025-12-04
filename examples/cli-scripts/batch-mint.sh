#!/bin/bash
# Batch Mint NFTs to a Collection
# Usage: ./batch-mint.sh <collection-mint> <count>

COLLECTION=$1
COUNT=${2:-10}

if [ -z "$COLLECTION" ]; then
  echo "Usage: ./batch-mint.sh <collection-mint> [count]"
  exit 1
fi

echo "🎨 Batch minting $COUNT NFTs to collection $COLLECTION"
echo ""

for i in $(seq 1 $COUNT); do
  echo "[$i/$COUNT] Minting NFT #$i..."

  tokens nft:create \
    --name "NFT #$i" \
    --symbol "MNFT" \
    --uri "https://arweave.net/placeholder" \
    --collection "$COLLECTION"

  if [ $? -eq 0 ]; then
    echo "   ✅ Success"
  else
    echo "   ❌ Failed"
  fi

  # Small delay
  sleep 1
done

echo ""
echo "🎉 Batch minting complete!"
