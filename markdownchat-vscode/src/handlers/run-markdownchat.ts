import * as fs from 'node:fs'

import * as vscode from 'vscode'
import OpenAI from 'openai'

export async function handleRunMarkdownchat(context: vscode.ExtensionContext) {
  const activeTextEditor = vscode.window.activeTextEditor

  if (!activeTextEditor) {
    vscode.window.showErrorMessage('No markdownchat file in focus')
    return
  }

  if (
    !activeTextEditor.document.fileName.endsWith('.md') ||
    activeTextEditor.document.languageId !== 'markdown'
  ) {
    vscode.window.showErrorMessage(
      "Expected markdownchat file to end with '.md' or have language set to Markdown",
    )
    return
  }

  const saved = await activeTextEditor.document.save()

  if (!saved) {
    vscode.window.showErrorMessage('Failed to save markdownchat file')
    return
  }

  let apiKey = (await context.secrets.get('OPENAI_API_KEY'))?.trim()

  if (!apiKey) {
    apiKey = (
      await vscode.window.showInputBox({
        password: true,
        title: 'Enter your OpenAI API Key',
        prompt: 'OpenAI API Key stored with VS Code SecretStorage',
        validateInput: (input) =>
          input.trim().length ? '' : 'OpenAI API Key is required',
      })
    )?.trim()

    if (!apiKey) {
      vscode.window.showErrorMessage('OpenAI API key is required')
      return
    }

    await context.secrets.store('OPENAI_API_KEY', apiKey)

    vscode.window.showInformationMessage(
      'Stored OpenAI API Key with VS Code SecretStorage',
    )
  }

  if (!apiKey?.trim()) {
    vscode.window.showErrorMessage('OpenAI API key is required')
    return
  }

  const configurations = vscode.workspace.getConfiguration('markdownchat')
  const baseURL = configurations.get('markdownchat.openaiBaseURL')
  const model = configurations.get('markdownchat.model')
  const temperature = configurations.get('markdownchat.temperature')

  const openai = new OpenAI({
    apiKey,
    baseURL:
      typeof baseURL === 'string' && baseURL.trim()
        ? baseURL
        : 'https://api.openai.com/v1',
  })

  const markdownchatFilePath = activeTextEditor.document.uri.fsPath

  // const markdownchatFileContent = vscode.window.activeTextEditor.document.getText()
  const markdownchatFileContent = await fs.promises.readFile(
    markdownchatFilePath,
    'utf8',
  )

  const { parse, createChatMessageName, createChatMessageSeparator } =
    await import('markdownchat')

  const chatMessages = parse(markdownchatFileContent)

  const chatCompletionStream = await openai.chat.completions.create({
    model: typeof model === 'string' && model.trim() ? model : 'gpt-3.5-turbo',
    temperature:
      typeof temperature === 'string' && temperature.trim()
        ? parseFloat(temperature)
        : 0.5,
    messages: chatMessages.map((chatMessage) => ({
      role: chatMessage.role === 'ai' ? 'assistant' : chatMessage.role,
      content: chatMessage.content,
      name: chatMessage.name,
    })),
    stream: true,
  })

  const markdownchatFileWriteStream = fs.createWriteStream(
    markdownchatFilePath,
    {
      flags: 'a',
    },
  )

  // TODO: Parameterize to --user-name or similar
  const userChatMessageName = createChatMessageName('me')
  const userChatMessageSeparator = createChatMessageSeparator('user')

  // TODO: Parameterize to --ai-name or similar
  const aiChatMessageName = createChatMessageName('ai')
  const aiChatMessageSeparator = createChatMessageSeparator('ai')

  markdownchatFileWriteStream.write(
    `\n${aiChatMessageSeparator}\n\n${aiChatMessageName}\n\n`,
  )

  for await (const chatCompletionChunk of chatCompletionStream) {
    const chatCompletionContent =
      chatCompletionChunk.choices[0]?.delta?.content || ''

    markdownchatFileWriteStream.write(chatCompletionContent)
  }

  markdownchatFileWriteStream.write(
    `\n\n${userChatMessageSeparator}\n\n${userChatMessageName}\n\n`,
  )

  markdownchatFileWriteStream.end()
}
