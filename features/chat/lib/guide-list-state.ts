/** The server carries the reading list in each "lanjut" reply as a markdown reference definition
 * (`[lens-list]: # "..."`). It renders as nothing, but it is not text a person should read or copy. */
export function stripListState(content: string): string {
  return content.replace(/^\[lens-list\]:[^\n]*(?:\n|$)/gim, "").trimEnd();
}

/** The newest guide reply carrying a list that is older than the history window (everything before
 * `windowStart`), or null. It is sent along so "lanjut" still finds its list however many side
 * questions came between; chats without a guide never have one. */
export function pinnedGuideReply<T extends { role: string; content: string }>(all: T[], windowStart: number): T | null {
  for (let i = windowStart - 1; i >= 0; i--) {
    if (all[i].role === "assistant" && /^\[lens-list\]:/im.test(all[i].content)) return all[i];
  }
  return null;
}
