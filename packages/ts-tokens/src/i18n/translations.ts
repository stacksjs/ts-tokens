/**
 * Translations
 */

import type { Locale, TranslationDictionary, TranslationKey, InterpolationValues, I18nConfig } from './types'

/**
 * English translations
 */
const en: TranslationDictionary = {
  // Common
  'common.success': 'Success',
  'common.error': 'Error',
  'common.loading': 'Loading...',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.retry': 'Retry',
  // Tokens
  'token.created': 'Token created successfully',
  'token.minted': 'Minted {amount} tokens',
  'token.transferred': 'Transferred {amount} tokens to {recipient}',
  'token.burned': 'Burned {amount} tokens',
  'token.frozen': 'Account frozen',
  'token.thawed': 'Account thawed',
  // NFTs
  'nft.created': 'NFT created successfully',
  'nft.minted': 'NFT minted: {name}',
  'nft.transferred': 'NFT transferred to {recipient}',
  'nft.burned': 'NFT burned',
  'nft.listed': 'NFT listed for {price} SOL',
  'nft.sold': 'NFT sold for {price} SOL',
  // Errors
  'error.insufficientBalance': 'Insufficient balance: need {required}, have {available}',
  'error.invalidAddress': 'Invalid address: {address}',
  'error.transactionFailed': 'Transaction failed: {reason}',
  'error.networkError': 'Network error: {message}',
  'error.unauthorized': 'Unauthorized: {reason}',
  'error.notFound': '{item} not found',
  // Governance
  'governance.proposalCreated': 'Proposal created: {title}',
  'governance.voteCast': 'Vote cast: {choice}',
  'governance.proposalPassed': 'Proposal passed',
  'governance.proposalFailed': 'Proposal failed',
  'governance.proposalExecuted': 'Proposal executed',
  // Staking
  'staking.staked': 'Staked {amount} tokens',
  'staking.unstaked': 'Unstaked {amount} tokens',
  'staking.rewardsClaimed': 'Claimed {amount} rewards',
}

/**
 * Spanish translations
 */
const es: TranslationDictionary = {
  'common.success': 'Éxito',
  'common.error': 'Error',
  'common.loading': 'Cargando...',
  'common.confirm': 'Confirmar',
  'common.cancel': 'Cancelar',
  'common.retry': 'Reintentar',
  'token.created': 'Token creado exitosamente',
  'token.minted': 'Acuñados {amount} tokens',
  'token.transferred': 'Transferidos {amount} tokens a {recipient}',
  'token.burned': 'Quemados {amount} tokens',
  'token.frozen': 'Cuenta congelada',
  'token.thawed': 'Cuenta descongelada',
  'nft.created': 'NFT creado exitosamente',
  'nft.minted': 'NFT acuñado: {name}',
  'nft.transferred': 'NFT transferido a {recipient}',
  'nft.burned': 'NFT quemado',
  'nft.listed': 'NFT listado por {price} SOL',
  'nft.sold': 'NFT vendido por {price} SOL',
  'error.insufficientBalance': 'Saldo insuficiente: necesita {required}, tiene {available}',
  'error.invalidAddress': 'Dirección inválida: {address}',
  'error.transactionFailed': 'Transacción fallida: {reason}',
  'error.networkError': 'Error de red: {message}',
  'error.unauthorized': 'No autorizado: {reason}',
  'error.notFound': '{item} no encontrado',
  'governance.proposalCreated': 'Propuesta creada: {title}',
  'governance.voteCast': 'Voto emitido: {choice}',
  'governance.proposalPassed': 'Propuesta aprobada',
  'governance.proposalFailed': 'Propuesta rechazada',
  'governance.proposalExecuted': 'Propuesta ejecutada',
  'staking.staked': 'Apostados {amount} tokens',
  'staking.unstaked': 'Retirados {amount} tokens',
  'staking.rewardsClaimed': 'Reclamadas {amount} recompensas',
}

/**
 * Chinese translations
 */
const zh: TranslationDictionary = {
  'common.success': '成功',
  'common.error': '错误',
  'common.loading': '加载中...',
  'common.confirm': '确认',
  'common.cancel': '取消',
  'common.retry': '重试',
  'token.created': '代币创建成功',
  'token.minted': '铸造了 {amount} 个代币',
  'token.transferred': '转账 {amount} 个代币到 {recipient}',
  'token.burned': '销毁了 {amount} 个代币',
  'token.frozen': '账户已冻结',
  'token.thawed': '账户已解冻',
  'nft.created': 'NFT 创建成功',
  'nft.minted': 'NFT 已铸造: {name}',
  'nft.transferred': 'NFT 已转移到 {recipient}',
  'nft.burned': 'NFT 已销毁',
  'nft.listed': 'NFT 已上架，价格 {price} SOL',
  'nft.sold': 'NFT 已售出，价格 {price} SOL',
  'error.insufficientBalance': '余额不足：需要 {required}，现有 {available}',
  'error.invalidAddress': '无效地址: {address}',
  'error.transactionFailed': '交易失败: {reason}',
  'error.networkError': '网络错误: {message}',
  'error.unauthorized': '未授权: {reason}',
  'error.notFound': '未找到 {item}',
  'governance.proposalCreated': '提案已创建: {title}',
  'governance.voteCast': '已投票: {choice}',
  'governance.proposalPassed': '提案通过',
  'governance.proposalFailed': '提案未通过',
  'governance.proposalExecuted': '提案已执行',
  'staking.staked': '已质押 {amount} 个代币',
  'staking.unstaked': '已解除质押 {amount} 个代币',
  'staking.rewardsClaimed': '已领取 {amount} 奖励',
}

/**
 * Japanese translations
 */
const ja: TranslationDictionary = {
  'common.success': '成功',
  'common.error': 'エラー',
  'common.loading': '読み込み中...',
  'common.confirm': '確認',
  'common.cancel': 'キャンセル',
  'common.retry': '再試行',
  'token.created': 'トークンが作成されました',
  'token.minted': '{amount} トークンを発行しました',
  'token.transferred': '{amount} トークンを {recipient} に送金しました',
  'token.burned': '{amount} トークンをバーンしました',
  'token.frozen': 'アカウントが凍結されました',
  'token.thawed': 'アカウントの凍結が解除されました',
  'nft.created': 'NFTが作成されました',
  'nft.minted': 'NFTを発行しました: {name}',
  'nft.transferred': 'NFTを {recipient} に転送しました',
  'nft.burned': 'NFTをバーンしました',
  'nft.listed': 'NFTを {price} SOL で出品しました',
  'nft.sold': 'NFTが {price} SOL で売れました',
  'error.insufficientBalance': '残高不足: {required} 必要、{available} 利用可能',
  'error.invalidAddress': '無効なアドレス: {address}',
  'error.transactionFailed': 'トランザクション失敗: {reason}',
  'error.networkError': 'ネットワークエラー: {message}',
  'error.unauthorized': '認証エラー: {reason}',
  'error.notFound': '{item} が見つかりません',
  'governance.proposalCreated': '提案が作成されました: {title}',
  'governance.voteCast': '投票しました: {choice}',
  'governance.proposalPassed': '提案が可決されました',
  'governance.proposalFailed': '提案が否決されました',
  'governance.proposalExecuted': '提案が実行されました',
  'staking.staked': '{amount} トークンをステーキングしました',
  'staking.unstaked': '{amount} トークンのステーキングを解除しました',
  'staking.rewardsClaimed': '{amount} の報酬を請求しました',
}

/**
 * Korean translations
 */
const ko: TranslationDictionary = {
  'common.success': '성공',
  'common.error': '오류',
  'common.loading': '로딩 중...',
  'common.confirm': '확인',
  'common.cancel': '취소',
  'common.retry': '재시도',
  'token.created': '토큰이 생성되었습니다',
  'token.minted': '{amount} 토큰을 발행했습니다',
  'token.transferred': '{amount} 토큰을 {recipient}에게 전송했습니다',
  'token.burned': '{amount} 토큰을 소각했습니다',
  'token.frozen': '계정이 동결되었습니다',
  'token.thawed': '계정 동결이 해제되었습니다',
  'nft.created': 'NFT가 생성되었습니다',
  'nft.minted': 'NFT를 발행했습니다: {name}',
  'nft.transferred': 'NFT를 {recipient}에게 전송했습니다',
  'nft.burned': 'NFT를 소각했습니다',
  'nft.listed': 'NFT를 {price} SOL에 등록했습니다',
  'nft.sold': 'NFT가 {price} SOL에 판매되었습니다',
  'error.insufficientBalance': '잔액 부족: {required} 필요, {available} 보유',
  'error.invalidAddress': '잘못된 주소: {address}',
  'error.transactionFailed': '트랜잭션 실패: {reason}',
  'error.networkError': '네트워크 오류: {message}',
  'error.unauthorized': '권한 없음: {reason}',
  'error.notFound': '{item}을(를) 찾을 수 없습니다',
  'governance.proposalCreated': '제안이 생성되었습니다: {title}',
  'governance.voteCast': '투표했습니다: {choice}',
  'governance.proposalPassed': '제안이 통과되었습니다',
  'governance.proposalFailed': '제안이 부결되었습니다',
  'governance.proposalExecuted': '제안이 실행되었습니다',
  'staking.staked': '{amount} 토큰을 스테이킹했습니다',
  'staking.unstaked': '{amount} 토큰 스테이킹을 해제했습니다',
  'staking.rewardsClaimed': '{amount} 보상을 청구했습니다',
}

/**
 * All translations
 */
export const translations: Record<Locale, TranslationDictionary> = {
  en,
  es,
  zh,
  ja,
  ko,
  fr: en, // Fallback to English
  de: en,
  pt: en,
  ru: en,
}

/**
 * Current config
 */
let currentConfig: I18nConfig = {
  locale: 'en',
  fallbackLocale: 'en',
}

/**
 * Set locale
 */
export function setLocale(locale: Locale): void {
  currentConfig.locale = locale
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
  return currentConfig.locale
}

/**
 * Set i18n config
 */
export function setI18nConfig(config: Partial<I18nConfig>): void {
  currentConfig = { ...currentConfig, ...config }
}

/**
 * Get translation
 */
export function t(key: TranslationKey, values?: InterpolationValues): string {
  const dict = translations[currentConfig.locale] ?? translations[currentConfig.fallbackLocale]
  let text = dict[key] ?? translations[currentConfig.fallbackLocale][key] ?? key

  // Interpolate values
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }

  return text
}

/**
 * Check if translation exists
 */
export function hasTranslation(key: TranslationKey, locale?: Locale): boolean {
  const dict = translations[locale ?? currentConfig.locale]
  return dict?.[key] !== undefined
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Locale[] {
  return Object.keys(translations) as Locale[]
}
