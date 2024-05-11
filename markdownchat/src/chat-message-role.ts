export const chatMessageRoles = ['system', 'user', 'ai'] as const

export type ChatMessageRole = (typeof chatMessageRoles)[number]

export function isChatMessageRole(
  chatMessageRole?: string,
): chatMessageRole is ChatMessageRole {
  return chatMessageRoles.includes(chatMessageRole as ChatMessageRole)
}
