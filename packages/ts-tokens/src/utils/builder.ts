/**
 * Builder Pattern Utilities
 *
 * Fluent builder classes for constructing Candy Machine and Token configurations
 * with type-safe method chaining.
 */

/**
 * Guard configuration for a candy machine.
 */
export interface CandyGuardBuildConfig {
  type: string
  settings: Record<string, unknown>
}

/**
 * Candy machine configuration produced by {@link CandyMachineConfigBuilder.build}.
 */
export interface CandyMachineBuildConfig {
  name: string
  symbol: string
  items: number
  price: number
  startDate: Date | null
  endDate: Date | null
  guards: CandyGuardBuildConfig[]
  sellerFeeBasisPoints: number
  isMutable: boolean
  maxEditionSupply: number
  configLineSettings: {
    prefixName: string
    nameLength: number
    prefixUri: string
    uriLength: number
    isSequential: boolean
  }
}

/**
 * Fluent builder for constructing candy machine configurations.
 *
 * @example
 * ```ts
 * const config = new CandyMachineConfigBuilder()
 *   .name('My Drop')
 *   .symbol('DROP')
 *   .items(1000)
 *   .price(1.5)
 *   .startDate(new Date('2025-06-01'))
 *   .addGuard({ type: 'solPayment', settings: { amount: 1.5 } })
 *   .build()
 * ```
 */
export class CandyMachineConfigBuilder {
  private _name = ''
  private _symbol = ''
  private _items = 0
  private _price = 0
  private _startDate: Date | null = null
  private _endDate: Date | null = null
  private _guards: CandyGuardBuildConfig[] = []
  private _sellerFeeBasisPoints = 0
  private _isMutable = true
  private _maxEditionSupply = 0
  private _configLineSettings = {
    prefixName: '',
    nameLength: 32,
    prefixUri: '',
    uriLength: 200,
    isSequential: false,
  }

  /**
   * Set the candy machine name.
   * @param value - Display name for the candy machine
   */
  name(value: string): this {
    this._name = value
    return this
  }

  /**
   * Set the token symbol for minted NFTs.
   * @param value - Short symbol (e.g., "DROP")
   */
  symbol(value: string): this {
    this._symbol = value
    return this
  }

  /**
   * Set the total number of items available.
   * @param value - Total items in the candy machine
   */
  items(value: number): this {
    this._items = value
    return this
  }

  /**
   * Set the mint price in SOL.
   * @param value - Price per mint in SOL
   */
  price(value: number): this {
    this._price = value
    return this
  }

  /**
   * Set the mint start date.
   * @param value - Start date for minting
   */
  startDate(value: Date): this {
    this._startDate = value
    return this
  }

  /**
   * Set the mint end date.
   * @param value - End date for minting
   */
  endDate(value: Date): this {
    this._endDate = value
    return this
  }

  /**
   * Add a guard to the candy machine.
   * @param guard - Guard configuration object
   */
  addGuard(guard: CandyGuardBuildConfig): this {
    this._guards.push(guard)
    return this
  }

  /**
   * Set seller fee basis points (royalties).
   * @param value - Royalty in basis points (e.g., 500 = 5%)
   */
  sellerFeeBasisPoints(value: number): this {
    this._sellerFeeBasisPoints = value
    return this
  }

  /**
   * Set whether the NFT metadata is mutable.
   * @param value - True for mutable metadata
   */
  isMutable(value: boolean): this {
    this._isMutable = value
    return this
  }

  /**
   * Set config line settings for the candy machine.
   * @param settings - Config line settings object
   */
  configLineSettings(settings: Partial<CandyMachineBuildConfig['configLineSettings']>): this {
    this._configLineSettings = { ...this._configLineSettings, ...settings }
    return this
  }

  /**
   * Build the final candy machine configuration.
   * @returns A validated CandyMachineBuildConfig object
   * @throws Error if required fields are missing
   */
  build(): CandyMachineBuildConfig {
    if (!this._name) {
      throw new Error('CandyMachineConfigBuilder: name is required. Call .name() before .build().')
    }
    if (this._items <= 0) {
      throw new Error('CandyMachineConfigBuilder: items must be > 0. Call .items() before .build().')
    }

    return {
      name: this._name,
      symbol: this._symbol,
      items: this._items,
      price: this._price,
      startDate: this._startDate,
      endDate: this._endDate,
      guards: [...this._guards],
      sellerFeeBasisPoints: this._sellerFeeBasisPoints,
      isMutable: this._isMutable,
      maxEditionSupply: this._maxEditionSupply,
      configLineSettings: { ...this._configLineSettings },
    }
  }
}

/**
 * Token configuration produced by `TokenBuilder.build()`.
 */
export interface TokenBuildConfig {
  name: string
  symbol: string
  decimals: number
  supply: bigint | null
  authority: string | null
  freezeAuthority: string | null
  uri: string
  useToken2022: boolean
  extensions: Array<{ type: string; [key: string]: unknown }>
}

/**
 * Fluent builder for constructing token creation configurations.
 *
 * @example
 * ```ts
 * const config = new TokenConfigBuilder()
 *   .name('MyToken')
 *   .symbol('MTK')
 *   .decimals(9)
 *   .supply(1_000_000n)
 *   .build()
 * ```
 */
export class TokenConfigBuilder {
  private _name = ''
  private _symbol = ''
  private _decimals = 9
  private _supply: bigint | null = null
  private _authority: string | null = null
  private _freezeAuthority: string | null = null
  private _uri = ''
  private _useToken2022 = false
  private _extensions: Array<{ type: string; [key: string]: unknown }> = []

  /**
   * Set the token name.
   * @param value - Human-readable token name
   */
  name(value: string): this {
    this._name = value
    return this
  }

  /**
   * Set the token symbol.
   * @param value - Short ticker symbol (e.g., "MTK")
   */
  symbol(value: string): this {
    this._symbol = value
    return this
  }

  /**
   * Set the number of decimal places.
   * @param value - Decimals (0-18, default 9)
   */
  decimals(value: number): this {
    this._decimals = value
    return this
  }

  /**
   * Set the initial supply to mint.
   * @param value - Initial supply as a bigint
   */
  supply(value: bigint): this {
    this._supply = value
    return this
  }

  /**
   * Set the mint authority public key.
   * @param value - Base58-encoded public key
   */
  authority(value: string): this {
    this._authority = value
    return this
  }

  /**
   * Set the freeze authority public key.
   * @param value - Base58-encoded public key, or null to disable freezing
   */
  freezeAuthority(value: string | null): this {
    this._freezeAuthority = value
    return this
  }

  /**
   * Set the metadata URI.
   * @param value - URL pointing to token metadata JSON
   */
  uri(value: string): this {
    this._uri = value
    return this
  }

  /**
   * Enable Token-2022 program.
   * @param value - True to use Token-2022
   */
  useToken2022(value = true): this {
    this._useToken2022 = value
    return this
  }

  /**
   * Add a Token-2022 extension.
   * @param extension - Extension configuration object
   */
  addExtension(extension: { type: string; [key: string]: unknown }): this {
    this._useToken2022 = true
    this._extensions.push(extension)
    return this
  }

  /**
   * Build the final token configuration.
   * @returns A validated TokenBuildConfig object
   * @throws Error if required fields are missing
   */
  build(): TokenBuildConfig {
    if (!this._name) {
      throw new Error('TokenConfigBuilder: name is required. Call .name() before .build().')
    }
    if (!this._symbol) {
      throw new Error('TokenConfigBuilder: symbol is required. Call .symbol() before .build().')
    }

    return {
      name: this._name,
      symbol: this._symbol,
      decimals: this._decimals,
      supply: this._supply,
      authority: this._authority,
      freezeAuthority: this._freezeAuthority,
      uri: this._uri,
      useToken2022: this._useToken2022,
      extensions: [...this._extensions],
    }
  }
}
