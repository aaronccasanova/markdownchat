import type { ChatMessageRole } from './chat-message-role.js'

export const chatMessageSeparatorDataAttribute = 'data-markdownchat-message'

export function createChatMessageSeparator(chatMessageRole: ChatMessageRole) {
  return `<hr ${chatMessageSeparatorDataAttribute}="${chatMessageRole}">`
}
