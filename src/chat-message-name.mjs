export const chatMessageNameRegExp = /^\*\*([^:]+):\*\*/

export function createChatMessageName(/** @type {string} */ name) {
  return `**${name}:**`
}
