export const chatMessageRoles = /** @type {const} */ (['system', 'user', 'ai'])

/** @typedef {(typeof chatMessageRoles)[number]} ChatMessageRole */

/**
 * @param {string} [chatMessageRole]
 * @returns {chatMessageRole is ChatMessageRole}
 */
export function isChatMessageRole(chatMessageRole) {
  return chatMessageRoles.includes(
    /** @type {ChatMessageRole} */ (chatMessageRole),
  )
}
