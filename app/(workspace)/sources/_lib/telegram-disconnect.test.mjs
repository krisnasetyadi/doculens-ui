import assert from "node:assert/strict";
import { test } from "node:test";
import { telegramDisconnectSummary } from "./telegram-disconnect.ts";

test("names the synced chats and their messages", () => {
  const connection = {
    selected_chats: [
      { chat_collection_id: "a", message_count: 640 },
      { chat_collection_id: "b", message_count: 600 },
      { chat_collection_id: "c", message_count: null },
    ],
  };
  assert.equal(
    telegramDisconnectSummary(connection),
    "This logs DocuLens out of Telegram and deletes 3 synced chats (1,240 messages).",
  );
});

test("one chat and one message read in the singular", () => {
  assert.equal(
    telegramDisconnectSummary({ selected_chats: [{ chat_collection_id: "a", message_count: 1 }] }),
    "This logs DocuLens out of Telegram and deletes 1 synced chat (1 message).",
  );
});

test("chats picked but never synced are not counted", () => {
  const connection = { selected_chats: [{ chat_collection_id: "", message_count: 9 }, { message_count: 3 }] };
  assert.equal(telegramDisconnectSummary(connection), "This logs DocuLens out of Telegram. No chats were synced from it.");
});
