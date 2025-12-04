# Events & Webhooks

Real-time event streaming and webhook management.

## Overview

ts-tokens provides:

- **Event Listener** - Real-time WebSocket events
- **Webhooks** - Send events to external endpoints
- **Polling** - Alternative to WebSocket

## Event Types

- `token_transfer` - Token transfers
- `token_mint` - Token minting
- `token_burn` - Token burning
- `nft_transfer` - NFT transfers
- `nft_mint` - NFT minting
- `nft_sale` - NFT sales
- `nft_listing` - NFT listings
- `stake` / `unstake` - Staking events
- `proposal_created` / `vote_cast` - Governance events

## Event Listener

### Subscribe to Events

```typescript
import { events, getConfig } from 'ts-tokens'

const config = await getConfig()

const listener = events.createEventListener(config.connection)

const subscriptionId = listener.subscribe(
  (event) => {
    console.log('Event:', event.type, event.signature)
  },
  {
    filter: {
      types: ['token_transfer', 'nft_sale'],
      mints: [tokenMint],
    },
  }
)

// Later: unsubscribe
listener.unsubscribe(subscriptionId)
```

### Listen for Token Transfers

```typescript
import { events, getConfig } from 'ts-tokens'

const config = await getConfig()

const unsubscribe = events.onTokenTransfer(
  config.connection,
  tokenMint,
  (event) => {
    if (event.type === 'token_transfer') {
      console.log(`Transfer: ${event.amount} from ${event.from} to ${event.to}`)
    }
  }
)

// Later: stop listening
unsubscribe()
```

### Listen for NFT Sales

```typescript
import { events, getConfig } from 'ts-tokens'

const config = await getConfig()

const unsubscribe = events.onNFTSale(
  config.connection,
  collectionMint,
  (event) => {
    if (event.type === 'nft_sale') {
      console.log(`Sale: ${event.mint} for ${event.price}`)
    }
  }
)
```

### Listen for Staking Events

```typescript
import { events, getConfig } from 'ts-tokens'

const config = await getConfig()

const unsubscribe = events.onStake(
  config.connection,
  stakingPool,
  (event) => {
    console.log(`Staking event: ${event.type}`)
  }
)
```

## Polling (Alternative)

```typescript
import { events, getConfig } from 'ts-tokens'

const config = await getConfig()

const { stop } = await events.pollEvents(
  config.connection,
  [account1, account2],
  {
    interval: 5000, // 5 seconds
    onEvent: (event) => {
      console.log('Event:', event)
    },
    onError: (error) => {
      console.error('Poll error:', error)
    },
  }
)

// Later: stop polling
stop()
```

## Webhooks

### Create Webhook Manager

```typescript
import { events } from 'ts-tokens'

const webhooks = events.createWebhookManager()

// Register webhook
webhooks.register('my-webhook', {
  url: 'https://myserver.com/webhook',
  events: ['nft_sale', 'token_transfer'],
  secret: 'my-secret-key',
  retries: 3,
  timeout: 30000,
})
```

### Dispatch Events

```typescript
import { events } from 'ts-tokens'

const webhooks = events.createWebhookManager()

// Register webhooks...

// Dispatch event to all matching webhooks
await webhooks.dispatch(event)

// Or send to specific webhook
await webhooks.send('my-webhook', event)
```

### Verify Webhook Signature

```typescript
import { events } from 'ts-tokens'

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature']
  const payload = JSON.stringify(req.body)

  const valid = events.verifyWebhookSignature(
    payload,
    signature,
    'my-secret-key'
  )

  if (!valid) {
    return res.status(401).send('Invalid signature')
  }

  // Process event
  const { event } = req.body
  console.log('Received:', event.type)

  res.status(200).send('OK')
})
```

### Retry Queue

```typescript
import { events } from 'ts-tokens'

const webhooks = events.createWebhookManager()

// Check retry queue size
const queueSize = webhooks.getRetryQueueSize('my-webhook')

// Process retries
await webhooks.processRetries()

// Clear retry queue
webhooks.clearRetryQueue('my-webhook')
```

## Event Filters

```typescript
import { events, getConfig } from 'ts-tokens'

const config = await getConfig()

const listener = events.createEventListener(config.connection)

listener.subscribe(callback, {
  filter: {
    // Filter by event type
    types: ['token_transfer', 'nft_sale'],

    // Filter by mint
    mints: [tokenMint],

    // Filter by account
    accounts: [walletAddress],

    // Filter by collection
    collections: [collectionMint],

    // Filter by minimum amount
    minAmount: 1000000n,

    // Filter by slot range
    startSlot: 100000,
    endSlot: 200000,
  },
})
```

## CLI Usage

```bash
# Listen for events
tokens events listen --types token_transfer,nft_sale --mint <mint>

# Register webhook
tokens webhook register --url https://myserver.com/webhook --events nft_sale

# List webhooks
tokens webhook list

# Test webhook
tokens webhook test <webhook-id>
```

## Related

- [Analytics](/api/analytics/index.md)
- [Indexer](/api/indexer/index.md)
