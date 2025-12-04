#!/bin/bash
# Set up a Candy Machine with common guards
# Usage: ./setup-candy-machine.sh

set -e

echo "🍬 Candy Machine Setup Script"
echo ""

# Configuration
read -p "Collection mint address: " COLLECTION
read -p "Number of items: " ITEMS
read -p "Price in SOL: " PRICE
read -p "Treasury address: " TREASURY
read -p "Go live date (YYYY-MM-DD HH:MM): " GO_LIVE

# Convert date to timestamp
GO_LIVE_TS=$(date -j -f "%Y-%m-%d %H:%M" "$GO_LIVE" "+%s" 2>/dev/null || date -d "$GO_LIVE" "+%s")

echo ""
echo "Creating Candy Machine..."

CM_OUTPUT=$(tokens cm:create \
  --collection "$COLLECTION" \
  --items "$ITEMS" \
  --price "$PRICE" \
  --symbol "MNFT" \
  --json)

CM_ADDRESS=$(echo "$CM_OUTPUT" | jq -r '.address')

echo "✅ Candy Machine created: $CM_ADDRESS"
echo ""

echo "Adding guards..."

# Add SOL payment guard
tokens cm:guards "$CM_ADDRESS" \
  --add sol-payment \
  --amount "$PRICE" \
  --destination "$TREASURY"

echo "✅ SOL payment guard added"

# Add start date guard
tokens cm:guards "$CM_ADDRESS" \
  --add start-date \
  --timestamp "$GO_LIVE_TS"

echo "✅ Start date guard added"

# Add mint limit guard
tokens cm:guards "$CM_ADDRESS" \
  --add mint-limit \
  --limit 3

echo "✅ Mint limit guard added (3 per wallet)"

echo ""
echo "🎉 Candy Machine setup complete!"
echo ""
echo "Candy Machine: $CM_ADDRESS"
echo "Collection: $COLLECTION"
echo "Items: $ITEMS"
echo "Price: $PRICE SOL"
echo "Go Live: $GO_LIVE"
echo ""
echo "Next steps:"
echo "  1. Upload assets: tokens cm:upload $CM_ADDRESS --assets ./assets/"
echo "  2. Verify setup: tokens cm:info $CM_ADDRESS"
