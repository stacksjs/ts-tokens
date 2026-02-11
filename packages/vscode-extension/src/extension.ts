/**
 * ts-tokens VS Code Extension
 *
 * Provides code snippets, problem matchers, and basic workspace
 * awareness for ts-tokens Solana development projects.
 */

import * as vscode from 'vscode'

/**
 * Extension activation.
 *
 * Called when the extension is activated (e.g., when a workspace
 * containing `tokens.config.ts` is opened).
 */
export function activate(context: vscode.ExtensionContext): void {
  // Register the status bar item
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  )
  statusItem.text = '$(circuit-board) ts-tokens'
  statusItem.tooltip = 'ts-tokens Solana development'
  statusItem.command = 'ts-tokens.showCommands'
  statusItem.show()
  context.subscriptions.push(statusItem)

  // Register command palette entry
  const showCommands = vscode.commands.registerCommand(
    'ts-tokens.showCommands',
    async () => {
      const items: vscode.QuickPickItem[] = [
        { label: 'Create Token', description: 'tokens token create' },
        { label: 'Create NFT', description: 'tokens nft create' },
        { label: 'Create Collection', description: 'tokens collection create' },
        { label: 'Start Dev Validator', description: 'tokens dev' },
        { label: 'Upload to Storage', description: 'tokens storage upload' },
        { label: 'Show Config', description: 'tokens config show' },
        { label: 'Fix Error', description: 'tokens fix <errorCode>' },
      ]

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a ts-tokens command to run',
      })

      if (selected) {
        const terminal = vscode.window.createTerminal('ts-tokens')
        terminal.show()
        terminal.sendText(selected.description ?? '')
      }
    },
  )
  context.subscriptions.push(showCommands)

  // Register the "fix error" command
  const fixCommand = vscode.commands.registerCommand(
    'ts-tokens.fixError',
    async () => {
      const errorCode = await vscode.window.showInputBox({
        prompt: 'Enter the error code to fix',
        placeHolder: 'e.g., INSUFFICIENT_BALANCE',
      })

      if (errorCode) {
        const terminal = vscode.window.createTerminal('ts-tokens fix')
        terminal.show()
        terminal.sendText(`tokens fix ${errorCode}`)
      }
    },
  )
  context.subscriptions.push(fixCommand)

  // Watch for tokens.config.ts changes and notify
  const configWatcher = vscode.workspace.createFileSystemWatcher(
    '**/tokens.config.{ts,js}',
  )

  configWatcher.onDidChange(() => {
    vscode.window.setStatusBarMessage('ts-tokens config updated', 3000)
  })

  context.subscriptions.push(configWatcher)

  // Log activation
  const outputChannel = vscode.window.createOutputChannel('ts-tokens')
  outputChannel.appendLine('ts-tokens extension activated')
  context.subscriptions.push(outputChannel)
}

/**
 * Extension deactivation.
 *
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  // Cleanup is handled by disposables registered in context.subscriptions
}
