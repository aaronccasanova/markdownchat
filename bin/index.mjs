#!/usr/bin/env node

import * as fs from 'node:fs'
import * as util from 'node:util'
import * as path from 'node:path'

import { OpenAI } from 'openai'
import {
  createChatMessageName,
  createChatMessageSeparator,
  parse,
} from '../src/index.mjs'

const cli = util.parseArgs({
  // markdownchat [markdownchat-file] (default: "./markdownchat.md")
  allowPositionals: true,
  options: {
    // -h, --help (boolean) Show help
    help: { type: 'boolean', short: 'h' },
    // -m, --model (string) OpenAI model (default: "gpt-3.5-turbo")
    model: { type: 'string', short: 'm' },
    // -t, --temperature (number) Temperature of model (default: 0.5)
    temperature: { type: 'string', short: 't' },
    'env-file': { type: 'string' },
    // TODO: Add --cwd option
    // - Update path.resolve calls
    // - Update fs.promises.readFile calls
    // - Update fs.createWriteStream calls, etc.
  },
})

if (cli.values.help) {
  console.log(
    `
Usage
  $ npx markdownchat [markdownchat-file] [options]

Options
  -h, --help         Show help text
  -m, --model        Name of model (default: "gpt-3.5-turbo")
  -t, --temperature  Temperature of model (default: 0.5)
  --env-file         Path to .env file

Examples
  $ npx markdownchat
  $ npx markdownchat ./markdownchat.md
  $ npx markdownchat ./markdownchat.md --model gpt-4.5-turbo
`.trim(),
  )

  process.exit(0)
}

// Tentatively matching Node.js --env-file behavior:
// https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs
// > Note: if the same variable is defined in the environment and in the file, the value from the environment takes precedence.
let apiKey = process.env.OPENAI_API_KEY?.trim()
let baseURL = process.env.OPENAI_BASE_URL?.trim()

if (!apiKey || !baseURL) {
  const envFilePath = cli.values['env-file']?.trim()

  if (envFilePath) {
    const { config } = await import('dotenv')

    const envVariables = config({
      path: path.resolve(envFilePath),
    })

    apiKey = apiKey || envVariables.parsed?.OPENAI_API_KEY?.trim()
    baseURL = baseURL || envVariables.parsed?.OPENAI_BASE_URL?.trim()
  }
}

if (!apiKey) throw new Error('Missing OPENAI_API_KEY')
if (!baseURL) baseURL = 'https://api.openai.com/v1'

const markdownchatFilePath = path.resolve(
  cli.positionals[0]?.trim() || './markdownchat.md',
)

if (!markdownchatFilePath.endsWith('.md')) {
  throw new Error('Expected markdownchat file to end with ".md"')
}

// TODO: Parameterize to --user-name or similar
const userChatMessageName = createChatMessageName('me')
const userChatMessageSeparator = createChatMessageSeparator('user')

// TODO: Parameterize to --ai-name or similar
const aiChatMessageName = createChatMessageName('ai')
const aiChatMessageSeparator = createChatMessageSeparator('ai')

if (!fs.existsSync(markdownchatFilePath)) {
  await fs.promises.writeFile(
    markdownchatFilePath,
    [
      // TODO: Parameterize these.
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
  console.log(
    `Created markdownchat file at ${path.relative(
      process.cwd(),
      markdownchatFilePath,
    )}`,
  )
  console.log(
    `Add your chat messages to the end of the file and re-run the command.`,
  )
  process.exit(0)
}

const markdownchatFileContent = await fs.promises.readFile(
  markdownchatFilePath,
  'utf8',
)

const chatMessages = parse(markdownchatFileContent)

const openai = new OpenAI({
  apiKey,
  baseURL,
})

const temperature = cli.values.temperature?.trim()

const chatCompletionStream = await openai.chat.completions.create({
  model: cli.values.model?.trim() || 'gpt-3.5-turbo',
  temperature: temperature ? parseFloat(temperature) : 0.5,
  messages: chatMessages.map((chatMessage) => ({
    role: chatMessage.role === 'ai' ? 'assistant' : chatMessage.role,
    content: chatMessage.content,
    name: chatMessage.name,
  })),
  stream: true,
})

const markdownchatFileWriteStream = fs.createWriteStream(markdownchatFilePath, {
  flags: 'a',
})

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
