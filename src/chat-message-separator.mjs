export const chatMessageSeparatorDataAttribute = 'data-markdownchat-message'

export function createChatMessageSeparator(
  /** @type {import('./chat-message-role.mjs').ChatMessageRole} */ chatMessageRole,
) {
  return `<hr ${chatMessageSeparatorDataAttribute}="${chatMessageRole}">`
}
