export const chatMessageNameRegExp = /^\*\*([^:]+):\*\*/

export function createChatMessageName(name: string) {
  return `**${name}:**`
}
