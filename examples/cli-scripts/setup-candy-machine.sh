#!/bin/bash
# Set up a Candy Machine
# Usage: ./setup-candy-machine.sh
#
# NOTE: the CLI creates the Candy Machine and can inspect its guards
# (`tokens candy:guards`), but guard *configuration* (sol-payment, start-date,
# mint-limit, allowlist, ...) is done through the ts-tokens library API, not
# the CLI.

set -e

echo "🍬 Candy Machine Setup Script"
echo ""

# Configuration
read -p "Collection mint address: " COLLECTION
read -p "Number of items: " ITEMS
read -p "Royalty (basis points, e.g. 500 = 5%): " ROYALTY

echo ""
echo "Creating Candy Machine..."

CM_OUTPUT=$(tokens candy:create \
--collection "$COLLECTION" \
--items "$ITEMS" \
--symbol "MNFT" \
--royalty "$ROYALTY")

echo "$CM_OUTPUT"

CM_ADDRESS=$(echo "$CM_OUTPUT" | grep "Address:" | head -1 | awk '{print $2}')

echo ""
echo "✅ Candy Machine created: $CM_ADDRESS"
echo ""

# Guards cannot be added via the CLI — `tokens candy:guards` only SHOWS the
# configured guards. Configure guards (sol-payment, start-date, mint-limit)
# with the ts-tokens library when creating the machine/candy guard:
#
#   import { programs, getConfig } from 'ts-tokens'
#   // programs.candyMachine.initializeCandyGuard(...)
#
# See docs/api/candy-machine/guards.md for the full guard configuration guide.
echo "ℹ️  Guard configuration (sol-payment, start-date, mint-limit) is done"
echo "   via the ts-tokens library API — the CLI only inspects guards:"
echo ""
echo "   tokens candy:guards $CM_ADDRESS"
echo ""
echo "🎉 Candy Machine setup complete!"
echo ""
echo "Candy Machine: $CM_ADDRESS"
echo "Collection: $COLLECTION"
echo "Items: $ITEMS"
echo "Royalty: $ROYALTY bps"
echo ""
echo "Next steps:"
echo "  1. Upload assets: tokens candy:upload ./assets/"
echo "  2. Add config lines: tokens candy:add $CM_ADDRESS ./items.json"
echo "  3. Verify setup: tokens candy:info $CM_ADDRESS"
