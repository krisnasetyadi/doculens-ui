const count = new Intl.NumberFormat("en-US");

/** The chats whose name contains `query`, ignoring case and the spaces around it. */
export function filterDialogs<T extends { title: string }>(dialogs: T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return dialogs;
  return dialogs.filter((dialog) => dialog.title.toLocaleLowerCase().includes(needle));
}

const KIND_LABELS: Record<string, string> = { user: "Personal", group: "Group", channel: "Channel" };

/** The type of a chat as the picker names it, with the member count for a group so similar names can be told apart. */
export function dialogMeta(dialog: { type: string; participants_count?: number | null }): string {
  const kind = KIND_LABELS[dialog.type] ?? "Chat";
  const members = dialog.participants_count;
  if (dialog.type !== "group" || members == null) return kind;
  return `${kind} · ${count.format(members)} ${members === 1 ? "member" : "members"}`;
}

/** What removing one Telegram chat deletes, for its confirmation dialog (MS-912). */
export function telegramChatRemoveSummary(chat: {
  title: string;
  chat_collection_id?: string | null;
  message_count?: number | null;
}): string {
  const untouched = "Your Telegram chat is not affected.";
  if (!chat.chat_collection_id) return `Removes '${chat.title}' from this connection. ${untouched}`;
  const messages = chat.message_count;
  const stored =
    messages == null ? "its stored messages" : `its ${count.format(messages)} stored ${messages === 1 ? "message" : "messages"}`;
  return `Removes '${chat.title}' and ${stored} from DocuLens. ${untouched}`;
}

/** How many messages a chat has stored. Chats synced before the count was saved have none to show. */
export function storedMessagesLabel(messages?: number | null): string {
  if (messages == null) return "Message count not saved yet";
  return `${count.format(messages)} ${messages === 1 ? "message" : "messages"} stored`;
}
