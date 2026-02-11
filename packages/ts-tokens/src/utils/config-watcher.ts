/**
 * Configuration File Watcher
 *
 * Watches a configuration file for changes and invokes a callback when
 * modifications are detected. Uses `fs.watch` with debouncing to avoid
 * duplicate notifications on rapid successive writes.
 */

import { watch, existsSync, readFileSync } from 'node:fs'
import type { FSWatcher } from 'node:fs'

/**
 * Options for the config watcher.
 */
export interface WatchConfigOptions {
  /** Debounce interval in milliseconds (default: 300) */
  debounceMs?: number
  /** If true, invoke onChange immediately with the current file contents */
  immediate?: boolean
}

/**
 * Return value from `watchConfig` — call `stop()` to close the watcher.
 */
export interface ConfigWatcherHandle {
  /** Stop watching the file */
  stop: () => void
  /** The underlying fs.FSWatcher instance */
  watcher: FSWatcher
}

/**
 * Watch a configuration file for changes and invoke a callback when the file
 * is modified.
 *
 * The watcher debounces rapid successive changes (common with editors that
 * perform atomic saves) and reads the new file contents before invoking the
 * callback.
 *
 * @param configPath - Absolute or relative path to the config file
 * @param onChange - Callback invoked with the new file contents on change
 * @param options - Optional watcher settings
 * @returns A handle with a `stop()` method to close the watcher
 *
 * @example
 * ```ts
 * const handle = watchConfig('./tokens.config.ts', (content) => {
 *   console.log('Config changed:', content)
 * })
 *
 * // Later, stop watching:
 * handle.stop()
 * ```
 */
export function watchConfig(
  configPath: string,
  onChange: (content: string) => void,
  options?: WatchConfigOptions,
): ConfigWatcherHandle {
  const debounceMs = options?.debounceMs ?? 300
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastContent: string | null = null

  // Read current content if immediate mode
  if (options?.immediate && existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8')
      lastContent = content
      onChange(content)
    } catch {
      // Ignore read errors on initial load
    }
  }

  const fsWatcher = watch(configPath, (eventType) => {
    if (eventType !== 'change') return

    // Debounce rapid changes
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = null

      try {
        if (!existsSync(configPath)) return

        const content = readFileSync(configPath, 'utf-8')

        // Only fire if content actually changed
        if (content !== lastContent) {
          lastContent = content
          onChange(content)
        }
      } catch {
        // File may be temporarily unavailable during atomic saves
      }
    }, debounceMs)
  })

  const stop = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    fsWatcher.close()
  }

  return { stop, watcher: fsWatcher }
}
