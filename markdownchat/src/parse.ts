import { chatMessageNameRegExp } from './chat-message-name.js'
import {
  chatMessageRoles,
  isChatMessageRole,
  type ChatMessageRole,
} from './chat-message-role.js'
import { chatMessageSeparatorDataAttribute } from './chat-message-separator.js'

import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import * as yaml from 'js-yaml'

type ExtractStrict<T, U extends T> = T extends U ? T : never

export interface SystemChatMessage {
  role: ExtractStrict<ChatMessageRole, 'system'>
  name?: string
  content: string
}

export interface UserChatMessage {
  role: ExtractStrict<ChatMessageRole, 'user'>
  name?: string
  content: string
}

export interface AIChatMessage {
  role: ExtractStrict<ChatMessageRole, 'ai'>
  name?: string
  content: string
}

export type ChatMessage = SystemChatMessage | UserChatMessage | AIChatMessage

export function parse(content: string): ChatMessage[] {
  const chatMessages: ChatMessage[] = []

  const markdownRoot = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .parse(content)

  type MarkdownRootContent = (typeof markdownRoot.children)[number]
  type Yaml = Extract<MarkdownRootContent, { type: 'yaml' }>

  const frontmatterNode = markdownRoot.children.find(
    (node) => node.type === 'yaml' && node,
  ) as Yaml | undefined

  if (frontmatterNode) {
    // TODO: Consider adding `model` to frontmatter
    const frontmatter = yaml.load(frontmatterNode.value) as {
      title?: string
      instructions?: string
    }

    const instructions = frontmatter.instructions?.trim() || ''

    if (instructions) {
      chatMessages.push({
        role: 'system',
        content: instructions,
      })
    }
  }

  const htmlRoot = unified().use(rehypeParse).parse(content)

  type HTMLRootContent = (typeof htmlRoot.children)[number]
  type Element = Extract<HTMLRootContent, { type: 'element' }>

  const htmlNode = htmlRoot.children.find(
    (node) => node.type === 'element' && node.tagName === 'html',
  ) as Element | undefined

  if (!htmlNode) throw new Error('Expected `html` node in `htmlRoot`')

  const bodyNode = htmlNode.children.find(
    (node) => node.type === 'element' && node.tagName === 'body',
  ) as Element | undefined

  if (!bodyNode) throw new Error('Expected `body` node in `htmlNode`')

  const chatMessageSeparatorNodes = bodyNode.children.filter(
    (node) => node.type === 'element' && node.tagName === 'hr',
  ) as Element[]

  for (let i = 0; i < chatMessageSeparatorNodes.length; i++) {
    const chatMessageSeparatorNode = chatMessageSeparatorNodes[i]!

    const chatMessageRole =
      chatMessageSeparatorNode.properties.dataMarkdownchatMessage

    if (
      typeof chatMessageRole !== 'string' ||
      !isChatMessageRole(chatMessageRole)
    ) {
      throw new Error(
        `Expected ${chatMessageSeparatorDataAttribute}=<role> to be one of ${chatMessageRoles.join(
          ', ',
        )}`,
      )
    }

    const chatMessageSeparatorEndOffset =
      chatMessageSeparatorNode.position?.end.offset

    if (!chatMessageSeparatorEndOffset) {
      throw new Error('Expected chatMessageSeparatorEndOffset to be defined')
    }

    const nextChatMessageSeparatorStartOffset =
      chatMessageSeparatorNodes[i + 1]?.position?.start.offset

    let chatMessageContent = content
      .slice(chatMessageSeparatorEndOffset, nextChatMessageSeparatorStartOffset)
      .trim()

    const chatMessageName = chatMessageContent.match(chatMessageNameRegExp)?.[1]

    if (chatMessageName) {
      chatMessageContent = chatMessageContent
        .replace(chatMessageNameRegExp, '')
        .trim()
    }

    chatMessages.push({
      role: chatMessageRole,
      content: chatMessageContent,
      name: chatMessageName,
    })
  }

  return chatMessages
}
