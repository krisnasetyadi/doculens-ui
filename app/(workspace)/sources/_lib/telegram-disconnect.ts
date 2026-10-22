/** What deleting a Telegram connection removes, for its confirmation dialog (MS-911): the
 * server logs DocuLens out of the account and deletes every chat the connection synced. */
export interface TelegramDisconnectTarget {
  selected_chats: { chat_collection_id?: string | null; message_count?: number | null }[];
}

const count = new Intl.NumberFormat("en-US");

export function telegramDisconnectSummary(connection: TelegramDisconnectTarget): string {
  const synced = connection.selected_chats.filter((chat) => chat.chat_collection_id);
  if (synced.length === 0) return "This logs DocuLens out of Telegram. No chats were synced from it.";
  const messages = synced.reduce((sum, chat) => sum + (chat.message_count ?? 0), 0);
  const chats = synced.length === 1 ? "1 synced chat" : `${synced.length} synced chats`;
  const plural = messages === 1 ? "message" : "messages";
  return `This logs DocuLens out of Telegram and deletes ${chats} (${count.format(messages)} ${plural}).`;
}
