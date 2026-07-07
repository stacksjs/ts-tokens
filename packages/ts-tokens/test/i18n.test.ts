import { describe, test, expect, beforeEach } from 'bun:test'
import {
  t,
  setLocale,
  getLocale,
  hasTranslation,
  getAvailableLocales,
  getFallbackLocales,
  translations,
  setI18nConfig,
} from '../src/i18n/translations'

beforeEach(() => {
  setLocale('en')
})

describe('setLocale / getLocale', () => {
  test('defaults to en', () => {
    expect(getLocale()).toBe('en')
  })

  test('changes locale', () => {
    setLocale('es')
    expect(getLocale()).toBe('es')
  })

  test('supports all defined locales', () => {
    const locales = ['en', 'es', 'zh', 'ja', 'ko'] as const
    for (const locale of locales) {
      setLocale(locale)
      expect(getLocale()).toBe(locale)
    }
  })
})

describe('t — translation lookup', () => {
  test('returns English translation by default', () => {
    expect(t('common.success')).toBe('Success')
  })

  test('returns Spanish translation when locale is es', () => {
    setLocale('es')
    expect(t('common.success')).toBe('Éxito')
  })

  test('returns Chinese translation when locale is zh', () => {
    setLocale('zh')
    expect(t('common.success')).toBe('成功')
  })

  test('interpolates values', () => {
    const result = t('token.minted', { amount: '1000' })
    expect(result).toBe('Minted 1000 tokens')
  })

  test('interpolates multiple values', () => {
    const result = t('token.transferred', { amount: '50', recipient: 'Alice' })
    expect(result).toBe('Transferred 50 tokens to Alice')
  })

  test('handles numeric interpolation values', () => {
    const result = t('token.minted', { amount: 500 })
    expect(result).toBe('Minted 500 tokens')
  })

  test('leaves unreplaced placeholders when value is not provided', () => {
    const result = t('token.minted')
    expect(result).toContain('{amount}')
  })

  test('falls back to key for missing translations', () => {
    const key = 'nonexistent.key' as any
    expect(t(key)).toBe('nonexistent.key')
  })

  test('falls back to fallback locale for unsupported locale', () => {
    setLocale('fr') // fr falls back to en
    expect(t('common.success')).toBe('Success')
  })
})

describe('hasTranslation', () => {
  test('returns true for existing key in current locale', () => {
    expect(hasTranslation('common.success')).toBe(true)
  })

  test('returns true for existing key in specified locale', () => {
    expect(hasTranslation('common.success', 'es')).toBe(true)
  })

  test('returns false for non-existing key', () => {
    expect(hasTranslation('does.not.exist' as any)).toBe(false)
  })

  test('returns true for all standard keys in en', () => {
    const keys = [
      'common.success', 'common.error', 'token.created', 'nft.minted',
      'error.insufficientBalance', 'governance.proposalCreated', 'staking.staked',
    ] as const
    for (const key of keys) {
      expect(hasTranslation(key, 'en')).toBe(true)
    }
  })
})

describe('getAvailableLocales', () => {
  test('returns array of locale strings', () => {
    const locales = getAvailableLocales()
    expect(Array.isArray(locales)).toBe(true)
    expect(locales.length).toBeGreaterThan(0)
  })

  test('includes en, es, zh, ja, ko', () => {
    const locales = getAvailableLocales()
    expect(locales).toContain('en')
    expect(locales).toContain('es')
    expect(locales).toContain('zh')
    expect(locales).toContain('ja')
    expect(locales).toContain('ko')
  })

  test('excludes English-fallback-only locales fr, de, pt, ru', () => {
    const locales = getAvailableLocales()
    expect(locales).not.toContain('fr')
    expect(locales).not.toContain('de')
    expect(locales).not.toContain('pt')
    expect(locales).not.toContain('ru')
  })
})

describe('getFallbackLocales', () => {
  test('lists the English-fallback-only locales', () => {
    const fallbacks = getFallbackLocales()
    expect(fallbacks).toContain('fr')
    expect(fallbacks).toContain('de')
    expect(fallbacks).toContain('pt')
    expect(fallbacks).toContain('ru')
  })

  test('does not include real translations', () => {
    const fallbacks = getFallbackLocales()
    expect(fallbacks).not.toContain('en')
    expect(fallbacks).not.toContain('es')
  })
})

describe('hasTranslation — fallback locales', () => {
  test('returns false for fallback-only locale even though lookup returns English', () => {
    expect(hasTranslation('common.success', 'fr')).toBe(false)
    // but t still resolves to English
    setLocale('fr')
    expect(t('common.success')).toBe('Success')
  })
})

describe('translations object', () => {
  test('has same keys across en, es, zh, ja, ko', () => {
    const enKeys = Object.keys(translations['en']).sort()
    for (const locale of ['es', 'zh', 'ja', 'ko'] as const) {
      const keys = Object.keys(translations[locale]).sort()
      expect(keys).toEqual(enKeys)
    }
  })
})

describe('setI18nConfig', () => {
  test('updates locale via config', () => {
    setI18nConfig({ locale: 'ja' })
    expect(getLocale()).toBe('ja')
  })
})
