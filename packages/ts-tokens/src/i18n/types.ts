/**
 * i18n Types
 */

/**
 * Supported locales
 */
export type Locale = 'en' | 'es' | 'zh' | 'ja' | 'ko' | 'fr' | 'de' | 'pt' | 'ru'

/**
 * Translation keys
 */
export type TranslationKey
  // Common
  = | 'common.success'
    | 'common.error'
    | 'common.loading'
    | 'common.confirm'
    | 'common.cancel'
    | 'common.retry'
  // Tokens
    | 'token.created'
    | 'token.minted'
    | 'token.transferred'
    | 'token.burned'
    | 'token.frozen'
    | 'token.thawed'
  // NFTs
    | 'nft.created'
    | 'nft.minted'
    | 'nft.transferred'
    | 'nft.burned'
    | 'nft.listed'
    | 'nft.sold'
  // Errors
    | 'error.insufficientBalance'
    | 'error.invalidAddress'
    | 'error.transactionFailed'
    | 'error.networkError'
    | 'error.unauthorized'
    | 'error.notFound'
  // Governance
    | 'governance.proposalCreated'
    | 'governance.voteCast'
    | 'governance.proposalPassed'
    | 'governance.proposalFailed'
    | 'governance.proposalExecuted'
  // Staking
    | 'staking.staked'
    | 'staking.unstaked'
    | 'staking.rewardsClaimed'

/**
 * Translation dictionary
 */
export type TranslationDictionary = Record<TranslationKey, string>

/**
 * i18n config
 */
export interface I18nConfig {
  locale: Locale
  fallbackLocale: Locale
  numberFormat?: Intl.NumberFormatOptions
  dateFormat?: Intl.DateTimeFormatOptions
}

/**
 * Interpolation values
 */
export type InterpolationValues = Record<string, string | number>
