# Internationalization (i18n)

Multi-language support for user-facing strings.

## Overview

ts-tokens supports multiple languages:

- **English** (en) - Default
- **Spanish** (es)
- **Chinese** (zh)
- **Japanese** (ja)
- **Korean** (ko)
- **French** (fr)
- **German** (de)
- **Portuguese** (pt)
- **Russian** (ru)

## Set Locale

```typescript
import { i18n } from 'ts-tokens'

// Set locale
i18n.setLocale('es')

// Get current locale
const locale = i18n.getLocale() // 'es'

// Get available locales
const locales = i18n.getAvailableLocales()
// ['en', 'es', 'zh', 'ja', 'ko', ...]
```

## Translations

```typescript
import { i18n } from 'ts-tokens'

// Simple translation
const msg = i18n.t('common.success') // 'Success'

// With interpolation
const msg2 = i18n.t('token.transferred', {
  amount: '1000',
  recipient: 'ABC123...',
})
// 'Transferred 1000 tokens to ABC123...'

// Check if translation exists
const exists = i18n.hasTranslation('token.created')
```

## Number Formatting

```typescript
import { i18n } from 'ts-tokens'

// Format number
i18n.formatNumber(1234567.89) // '1,234,567.89'

// Format currency
i18n.formatCurrency(1234.56, 'USD') // '$1,234.56'

// Format SOL
i18n.formatSOL(1500000000n) // '1.5 SOL'

// Format token amount
i18n.formatTokenAmount(1000000n, 6, 'USDC') // '1 USDC'

// Format percentage
i18n.formatPercent(75) // '75%'

// Format compact
i18n.formatCompact(1500000) // '1.5M'
```

## Date Formatting

```typescript
import { i18n } from 'ts-tokens'

const date = new Date()

// Short format
i18n.formatDateShort(date) // '01/15/2024'

// Long format
i18n.formatDateLong(date) // 'January 15, 2024'

// Date and time
i18n.formatDateTime(date) // 'Jan 15, 2024, 10:30 AM'

// Relative time
i18n.formatRelativeTime(date) // '2 hours ago'

// Duration
i18n.formatDuration(3661) // '1h 1m 1s'
```

## Address Formatting

```typescript
import { i18n } from 'ts-tokens'

// Truncate address
i18n.formatAddress('ABC123...XYZ789', 4) // 'ABC1...Z789'

// Format signature
i18n.formatSignature('sig123...', 8) // 'sig12345...23456789'

// Format bytes
i18n.formatBytes(1048576) // '1.00 MB'
```

## CLI Usage

```bash
# Set language
tokens config set language es

# View in Spanish
tokens token info <mint>
# Output in Spanish
```

## Component Props

```tsx
import { TokenBalance } from 'ts-tokens-react'

// Override locale for component
<TokenBalance mint={mint} locale="ja" />
```

## Adding Translations

```typescript
// Custom translations can be added
import { i18n } from 'ts-tokens'

// Extend translations (future feature)
i18n.addTranslations('en', {
  'custom.message': 'My custom message',
})
```

## Related

- [Configuration](/api/config/index.md)
