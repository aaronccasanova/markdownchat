import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import * as yaml from 'js-yaml'

import { chatMessageRoles, isChatMessageRole } from './chat-message-role.mjs'
import { chatMessageSeparatorDataAttribute } from './chat-message-separator.mjs'
import { chatMessageNameRegExp } from './chat-message-name.mjs'

/**
 * @typedef {object} SystemChatMessage
 * @property {'system'} role
 * @property {string} [name]
 * @property {string} content
 */

/**
 * @typedef {object} UserChatMessage
 * @property {'user'} role
 * @property {string} [name]
 * @property {string} content
 */

/**
 * @typedef {object} AIChatMessage
 * @property {'ai'} role
 * @property {string} [name]
 * @property {string} content
 */

/** @typedef {SystemChatMessage | UserChatMessage | AIChatMessage} ChatMessage */

/**
 * @param {string} content
 * @returns {ChatMessage[]}
 */
export function parse(content) {
  /** @type {ChatMessage[]} */
  const chatMessages = []

  const markdownRoot = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .parse(content)

  const frontmatterNode = markdownRoot.children.find(
    (node) => node.type === 'yaml',
  )

  if (frontmatterNode) {
    // TODO: Consider adding `model` to frontmatter
    const frontmatter =
      /** @type {{ title?: string; instructions?: string; }} */ (
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

  const htmlRoot = unified().use(rehypeParse).parse(content)

  /** @typedef {(typeof htmlRoot.children)[number]} RootContent */
  /** @typedef {Extract<RootContent, {type: 'element'}>} Element */

  const htmlNode = /** @type {Element | undefined} */ (
    htmlRoot.children.find(
      (node) => node.type === 'element' && node.tagName === 'html',
    )
  )

  if (!htmlNode) throw new Error('Expected `html` node in `htmlRoot`')

  const bodyNode = /** @type {Element | undefined} */ (
    htmlNode.children.find(
      (node) => node.type === 'element' && node.tagName === 'body',
    )
  )

  if (!bodyNode) throw new Error('Expected `body` node in `htmlNode`')

  for (let i = 0; i < bodyNode.children.length; i++) {
    const childNode = bodyNode.children[i]

    if (childNode.type !== 'element' || childNode.tagName !== 'hr') {
      continue
    }

    const chatMessageRole = childNode.properties.dataMarkdownchatMessage

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

    const currentSeparatorIndexEnd = childNode.position?.end.offset

    if (!currentSeparatorIndexEnd) {
      throw new Error('Expected currentSeparatorIndexEnd to be defined')
    }

    const nextSeparatorIndexStart = bodyNode[i + 1]?.position?.start.offset

    let chatMessageContent = content
      .slice(currentSeparatorIndexEnd, nextSeparatorIndexStart)
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
