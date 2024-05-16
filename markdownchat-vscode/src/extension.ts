import * as vscode from 'vscode'

import { handleNewMarkdownchat } from './handlers/new-markdownchat'
import { handleRunMarkdownchat } from './handlers/run-markdownchat'

export async function activate(context: vscode.ExtensionContext) {
  console.log('Activated markdownchat')

  const newMarkdownchatDisposable = vscode.commands.registerCommand(
    'markdownchat.new-markdownchat',
    handleNewMarkdownchat,
  )

  context.subscriptions.push(newMarkdownchatDisposable)

  const runMarkdownchatDisposable = vscode.commands.registerCommand(
    'markdownchat.run-markdownchat',
    () => handleRunMarkdownchat(context),
  )

  context.subscriptions.push(runMarkdownchatDisposable)
}

export function deactivate() {}
