#!/usr/bin/env node

import * as fs from 'node:fs'
import * as util from 'node:util'
import * as path from 'node:path'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import * as yaml from 'js-yaml'
import { OpenAI } from 'openai'

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

const userRole = 'user'
// TODO: Parameterize to --user-name or similar
const userChatMessageName = createChatMessageName('me')
const userChatMessageSeparator = createChatMessageSeparator(userRole)

const aiRole = 'assistant'
// TODO: Parameterize to --ai-name or similar
const aiChatMessageName = createChatMessageName('ai')
const aiChatMessageSeparator = createChatMessageSeparator(aiRole)

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

const processor = unified().use(remarkParse).use(remarkFrontmatter)
const root = processor.parse(markdownchatFileContent)

/**
 * @typedef {{
 *   role: 'system' | 'user' | 'assistant';
 *   content: string;
 *   name?: string;
 * }} ChatMessage
 *
 * @type {ChatMessage[]}
 */
const chatMessages = []

const frontmatterNode = root.children.find((node) => node.type === 'yaml')

if (frontmatterNode) {
  // TODO: Consider adding `model` to frontmatter
  const frontmatter =
    /** @type {{ title?: string; description?: string; instructions?: string; }} */ (
      yaml.load(frontmatterNode.value)
    )

  const instructions = frontmatter.instructions?.trim() || ''

  if (instructions) {
    chatMessages.push({
      role: 'system',
      content: instructions,
    })
  }
}

const htmlNodes = root.children.filter(
  (rootContent) => rootContent.type === 'html',
)
// TODO: Parse HTML nodes to get the locations of chat message separators accurately.
// Why: `remark-parse` groups HTML nodes in markdown files and this initial approach
// would skip over separators when messages end with HTML nodes.
const htmlSeparatorNodes = htmlNodes.filter(
  (node) =>
    node.value.startsWith(userChatMessageSeparator) ||
    node.value.startsWith(aiChatMessageSeparator),
)

const chatMessageRoleRegExp = /data-chat-message-role="([^"]+)"/
const chatMessageNameRegExp = /^\*\*([^:]+):\*\*/

for (let i = 0; i < htmlSeparatorNodes.length; i++) {
  const chatMessageRole = htmlSeparatorNodes[i].value.match(
    chatMessageRoleRegExp,
  )?.[1]

  if (!(chatMessageRole === userRole || chatMessageRole === aiRole)) {
    throw new Error(
      `Expected chat message role to be "${userRole}" or "${aiRole}"`,
    )
  }

  const currentSeparatorIndexEnd = htmlSeparatorNodes[i].position?.end.offset

  if (!currentSeparatorIndexEnd) {
    throw new Error('Could not find end of the current chat message separator')
  }

  const nextSeparatorIndexStart =
    htmlSeparatorNodes[i + 1]?.position?.start.offset

  let chatMessageContent = markdownchatFileContent
    .slice(currentSeparatorIndexEnd, nextSeparatorIndexStart)
    .trim()

  const chatMessageName = chatMessageContent.match(chatMessageNameRegExp)?.[1]

  if (chatMessageName) {
    chatMessageContent = chatMessageContent
      .replace(chatMessageNameRegExp, '')
      .trim()
  }

  if (!chatMessageContent) throw new Error('Missing chat message content')

  chatMessages.push({
    role: chatMessageRole,
    content: chatMessageContent,
    name: chatMessageName,
  })
}

const openai = new OpenAI({
  apiKey,
  baseURL,
})

const temperature = cli.values.temperature?.trim()

const chatCompletionStream = await openai.chat.completions.create({
  model: cli.values.model?.trim() || 'gpt-3.5-turbo',
  temperature: temperature ? parseFloat(temperature) : 0.5,
  messages: chatMessages,
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

function createChatMessageSeparator(/** @type {string} */ role) {
  return `<hr data-chat-message-role="${role}">`
}

function createChatMessageName(/** @type {string} */ name) {
  return `**${name}:**`
}
