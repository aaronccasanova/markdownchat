import * as fs from 'node:fs'

import * as vscode from 'vscode'

export async function handleNewMarkdownchat() {
  const workspaceURI = vscode.workspace.workspaceFolders?.[0]?.uri

  if (!workspaceURI) {
    vscode.window.showErrorMessage('No workspace folder found')
    return
  }

  const markdownchatURI = await vscode.window.showSaveDialog({
    title: 'Create markdownchat file',
    saveLabel: 'Create markdownchat file',
    defaultUri: vscode.Uri.joinPath(workspaceURI, 'markdownchat.md'),
  })

  if (!markdownchatURI) {
    vscode.window.showErrorMessage('No markdownchat file created')
    return
  }

  const markdownchatFilePath = markdownchatURI.fsPath

  if (!markdownchatFilePath.endsWith('.md')) {
    vscode.window.showErrorMessage(
      'Expected markdownchat file to end with ".md"',
    )
    return
  }

  if (fs.existsSync(markdownchatFilePath)) {
    vscode.window.showErrorMessage('Selected markdownchat file already exists')
    return
  }

  const { createChatMessageName, createChatMessageSeparator } = await import(
    'markdownchat'
  )

  // TODO: Parameterize to --user-name or similar
  const userChatMessageName = createChatMessageName('me')
  const userChatMessageSeparator = createChatMessageSeparator('user')

  await fs.promises.writeFile(
    markdownchatFilePath,
    [
      '---',
      'title: Markdown Chat Conversation',
      'instructions: You are an AI in a markdown chat conversation.',
      '---',
      '',
      userChatMessageSeparator,
      '',
      userChatMessageName,
      '',
      '',
    ].join('\n'),
  )

  vscode.window.showInformationMessage(
    `Created markdownchat file at ${markdownchatFilePath}`,
  )
}
