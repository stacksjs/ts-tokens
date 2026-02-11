/**
 * Security Notifications
 *
 * Email, Discord, Telegram, and webhook integration for security events.
 */

import type { SecurityEvent } from './monitor'

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'discord' | 'telegram' | 'webhook'

/**
 * Email notification config
 */
export interface EmailConfig {
  channel: 'email'
  smtpEndpoint: string
  from: string
  to: string[]
  apiKey?: string
  minSeverity?: SecurityEvent['severity']
}

/**
 * Discord notification config
 */
export interface DiscordConfig {
  channel: 'discord'
  webhookUrl: string
  username?: string
  minSeverity?: SecurityEvent['severity']
}

/**
 * Telegram notification config
 */
export interface TelegramConfig {
  channel: 'telegram'
  botToken: string
  chatId: string
  minSeverity?: SecurityEvent['severity']
}

/**
 * Webhook notification config
 */
export interface WebhookConfig {
  channel: 'webhook'
  url: string
  headers?: Record<string, string>
  minSeverity?: SecurityEvent['severity']
}

export type NotificationConfig = EmailConfig | DiscordConfig | TelegramConfig | WebhookConfig

const SEVERITY_ORDER: Record<SecurityEvent['severity'], number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

const SEVERITY_COLORS: Record<SecurityEvent['severity'], number> = {
  info: 0x3498db,
  low: 0x2ecc71,
  medium: 0xf39c12,
  high: 0xe74c3c,
  critical: 0x8b0000,
}

function meetsMinSeverity(event: SecurityEvent, minSeverity?: SecurityEvent['severity']): boolean {
  if (!minSeverity) return true
  return SEVERITY_ORDER[event.severity] >= SEVERITY_ORDER[minSeverity]
}

/**
 * Send email notification via SMTP relay endpoint
 */
export async function sendEmailNotification(config: EmailConfig, event: SecurityEvent): Promise<void> {
  const subject = `[${event.severity.toUpperCase()}] Security Alert: ${event.type.replace(/_/g, ' ')}`
  const body = [
    `Security Event Detected`,
    ``,
    `Type: ${event.type.replace(/_/g, ' ')}`,
    `Severity: ${event.severity.toUpperCase()}`,
    `Address: ${event.address}`,
    `Time: ${event.timestamp.toISOString()}`,
    ``,
    `Details:`,
    JSON.stringify(event.details, null, 2),
  ].join('\n')

  await fetch(config.smtpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to,
      subject,
      text: body,
    }),
    signal: AbortSignal.timeout(10000),
  })
}

/**
 * Send Discord notification via webhook with embed
 */
export async function sendDiscordNotification(config: DiscordConfig, event: SecurityEvent): Promise<void> {
  const embed = {
    title: `Security Alert: ${event.type.replace(/_/g, ' ')}`,
    color: SEVERITY_COLORS[event.severity],
    fields: [
      { name: 'Severity', value: event.severity.toUpperCase(), inline: true },
      { name: 'Address', value: `\`${event.address}\``, inline: true },
      { name: 'Time', value: event.timestamp.toISOString(), inline: false },
      { name: 'Details', value: `\`\`\`json\n${JSON.stringify(event.details, null, 2)}\n\`\`\``, inline: false },
    ],
    timestamp: event.timestamp.toISOString(),
  }

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.username ?? 'Security Monitor',
      embeds: [embed],
    }),
    signal: AbortSignal.timeout(10000),
  })
}

/**
 * Send Telegram notification via Bot API
 */
export async function sendTelegramNotification(config: TelegramConfig, event: SecurityEvent): Promise<void> {
  const text = [
    `🚨 *Security Alert*`,
    ``,
    `*Type:* ${event.type.replace(/_/g, ' ')}`,
    `*Severity:* ${event.severity.toUpperCase()}`,
    `*Address:* \`${event.address}\``,
    `*Time:* ${event.timestamp.toISOString()}`,
    ``,
    `*Details:*`,
    `\`\`\`json`,
    JSON.stringify(event.details, null, 2),
    `\`\`\``,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      parse_mode: 'Markdown',
    }),
    signal: AbortSignal.timeout(10000),
  })
}

/**
 * Send webhook notification
 */
async function sendWebhookChannelNotification(config: WebhookConfig, event: SecurityEvent): Promise<void> {
  await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString(),
    }),
    signal: AbortSignal.timeout(10000),
  })
}

/**
 * Dispatch notification to a specific config
 */
async function dispatchToChannel(config: NotificationConfig, event: SecurityEvent): Promise<void> {
  switch (config.channel) {
    case 'email':
      return sendEmailNotification(config, event)
    case 'discord':
      return sendDiscordNotification(config, event)
    case 'telegram':
      return sendTelegramNotification(config, event)
    case 'webhook':
      return sendWebhookChannelNotification(config, event)
  }
}

/**
 * Notification dispatcher result
 */
export interface NotificationDispatchResult {
  channel: NotificationChannel
  success: boolean
  error?: Error
}

/**
 * Create a notification dispatcher that sends to all configured channels
 */
export function createNotificationDispatcher(configs: NotificationConfig[]): (event: SecurityEvent) => Promise<NotificationDispatchResult[]> {
  return async (event: SecurityEvent): Promise<NotificationDispatchResult[]> => {
    const results: NotificationDispatchResult[] = []

    await Promise.all(
      configs.map(async (config) => {
        if (!meetsMinSeverity(event, config.minSeverity)) {
          return
        }

        try {
          await dispatchToChannel(config, event)
          results.push({ channel: config.channel, success: true })
        } catch (err) {
          results.push({ channel: config.channel, success: false, error: err as Error })
        }
      })
    )

    return results
  }
}
