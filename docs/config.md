# Configuration

`tokens` can be configured using a `tokens.config.ts` _(or `tokens.config.js`)_ file and it will be automatically loaded when running the `tokens` command.

```ts
// tokens.config.{ts,js}
import type { tokensConfig } from 'ts-tokens'
import os from 'node:os'
import path from 'node:path'

const config: tokensConfig = {
  /**

   _ The type of the QR code.

   _/
  type: 'qr', // 'qr' | 'bar'

  options: {
    /**

     _ The width of the QR code.

     _/
    width: 2,
    /**

     _ The height of the QR code.

     _/
    height: 100,
    /**

     _ The format of the QR code.

     _/
    format: 'auto',
    /**

     _ Whether to display the value in the QR code.

     _/
    displayValue: true,
    /**

     _ The font options for the QR code.

     _/
    fontOptions: '',
    /**

     _ The font for the QR code.

     _/
    font: 'monospace',
    /**

     _ The text for the QR code.

     _/
    text: undefined,
    /**

     _ The text alignment for the QR code.

     _/
    textAlign: 'center', // 'left' | 'center' | 'right'
    /**

     _ The text position for the QR code.

     _/
    textPosition: 'bottom', // 'top' | 'bottom' | 'left' | 'right'
    /**

     _ The text margin for the QR code.

     _/
    textMargin: 2,
    /**

     _ The font size for the QR code.

     _/
    fontSize: 20,
    /**

     _ The background color for the QR code.

     _/
    background: '#ffffff',
    /**

     _ The line color for the QR code.

     _/
    lineColor: '#000000',
    /**

     _ The margin for the QR code.

     _/
    margin: 10,
    /**

     _ The margin top for the QR code.

     _/
    marginTop: undefined,
    /**

     _ The margin right for the QR code.

     _/
    marginBottom: undefined,
    /**

     _ The margin left for the QR code.

     _/
    marginLeft: undefined,
    /**

     _ The margin right for the QR code.

     _/
    marginRight: undefined,
    /**

     _ The error correction level for the QR code.

     _/
    valid() { },
  },
}

export default config
```

_Then run:_

```bash
./rpx start
```

To learn more, head over to the [documentation](https://ts-tokens.dev).
