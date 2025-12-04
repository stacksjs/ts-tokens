/**
 * Webhook Management
 *
 * Send events to external endpoints.
 */

import type {
  WebhookConfig,
  WebhookPayload,
  TokenEvent,
  EventType,
} from './types'
import { createHmac } from 'crypto'

/**
 * Webhook manager
 */
export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map()
  private retryQueue: Map<string, { payload: WebhookPayload; attempts: number }[]> = new Map()

  /**
   * Register a webhook
   */
  register(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, config)
    this.retryQueue.set(id, [])
  }

  /**
   * Unregister a webhook
   */
  unregister(id: string): boolean {
    this.retryQueue.delete(id)
    return this.webhooks.delete(id)
  }

  /**
   * Get webhook config
   */
  get(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id)
  }

  /**
   * List all webhooks
   */
  list(): Array<{ id: string; config: WebhookConfig }> {
    return Array.from(this.webhooks.entries()).map(([id, config]) => ({
      id,
      config,
    }))
  }

  /**
   * Send event to all matching webhooks
   */
  async dispatch(event: TokenEvent): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [id, config] of this.webhooks) {
      if (config.events.includes(event.type)) {
        promises.push(this.send(id, event))
      }
    }

    await Promise.allSettled(promises)
  }

  /**
   * Send event to specific webhook
   */
  async send(webhookId: string, event: TokenEvent): Promise<void> {
    const config = this.webhooks.get(webhookId)
    if (!config) {
      throw new Error(`Webhook not found: ${webhookId}`)
    }

    const payload: WebhookPayload = {
      id: generatePayloadId(),
      timestamp: Date.now(),
      event,
      signature: event.signature,
    }

    try {
      await this.deliver(config, payload)
    } catch (error) {
      // Add to retry queue
      const queue = this.retryQueue.get(webhookId) ?? []
      queue.push({ payload, attempts: 1 })
      this.retryQueue.set(webhookId, queue)
    }
  }

  /**
   * Deliver payload to webhook
   */
  private async deliver(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const body = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add signature if secret configured
    if (config.secret) {
      headers['X-Webhook-Signature'] = signPayload(body, config.secret)
    }

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeout ?? 30000
    )

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Process retry queue
   */
  async processRetries(): Promise<void> {
    for (const [webhookId, queue] of this.retryQueue) {
      const config = this.webhooks.get(webhookId)
      if (!config) continue

      const maxRetries = config.retries ?? 3
      const remaining: typeof queue = []

      for (const item of queue) {
        if (item.attempts >= maxRetries) {
          // Max retries reached, drop
          continue
        }

        try {
          await this.deliver(config, item.payload)
        } catch {
          remaining.push({
            payload: item.payload,
            attempts: item.attempts + 1,
          })
        }
      }

      this.retryQueue.set(webhookId, remaining)
    }
  }

  /**
   * Get retry queue size
   */
  getRetryQueueSize(webhookId: string): number {
    return this.retryQueue.get(webhookId)?.length ?? 0
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue(webhookId: string): void {
    this.retryQueue.set(webhookId, [])
  }
}

/**
 * Generate unique payload ID
 */
function generatePayloadId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Sign payload with secret
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret)
  return signature === expected
}

/**
 * Create webhook manager
 */
export function createWebhookManager(): WebhookManager {
  return new WebhookManager()
}

/**
 * Create webhook config
 */
export function createWebhookConfig(
  url: string,
  events: EventType[],
  options: {
    secret?: string
    retries?: number
    timeout?: number
  } = {}
): WebhookConfig {
  return {
    url,
    events,
    secret: options.secret,
    retries: options.retries ?? 3,
    timeout: options.timeout ?? 30000,
  }
}

/**
 * Format webhook payload for logging
 */
export function formatWebhookPayload(payload: WebhookPayload): string {
  return [
    `ID: ${payload.id}`,
    `Event: ${payload.event.type}`,
    `Signature: ${payload.signature}`,
    `Timestamp: ${new Date(payload.timestamp).toISOString()}`,
  ].join('\n')
}
