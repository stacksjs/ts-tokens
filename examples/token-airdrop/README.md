# Token Airdrop Example

Airdrop tokens to multiple addresses from a CSV file.

## Setup

1. Create a recipients CSV file:

```csv
address,amount
ABC123...,100
DEF456...,200
GHI789...,150
```

2. Set environment variables:

```bash
export MINT_ADDRESS="your-token-mint-address"
export DECIMALS=9
export RECIPIENTS_FILE="./recipients.csv"
```

## Run

```bash
bun run examples/token-airdrop/index.ts
```

Or with inline environment variables:

```bash
MINT_ADDRESS=ABC123... DECIMALS=9 RECIPIENTS_FILE=./recipients.csv bun run examples/token-airdrop/index.ts
```

## Output

```text
🚀 Starting airdrop of 3 recipients

Token: ABC123...
Decimals: 9

[1/3] Sending 100 tokens to ABC123...
   ✅ Success: 5KQwCGnNYZ...
[2/3] Sending 200 tokens to DEF456...
   ✅ Success: 3JmPqRsTuV...
[3/3] Sending 150 tokens to GHI789...
   ✅ Success: 7XyZaBcDeF...

📊 Airdrop Summary:
   Successful: 3
   Failed: 0
   Total: 3
```

## Notes

- Ensure you have enough tokens in your wallet
- Ensure you have enough SOL for transaction fees
- The script adds a 500ms delay between transfers to avoid rate limiting
- Failed transfers are logged but don't stop the airdrop
