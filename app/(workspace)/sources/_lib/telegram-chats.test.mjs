import assert from "node:assert/strict";
import { test } from "node:test";
import { dialogMeta, filterDialogs, storedMessagesLabel, telegramChatRemoveSummary } from "./telegram-chats.ts";

const dialogs = [{ title: "Tim Marketing" }, { title: "tim marketing lama" }, { title: "Budi" }, { title: "Ünal" }];

test("finds a chat by name, ignoring case and the spaces around the search", () => {
  assert.deepEqual(filterDialogs(dialogs, "  MARKETING ").map((d) => d.title), ["Tim Marketing", "tim marketing lama"]);
  assert.deepEqual(filterDialogs(dialogs, "ünal").map((d) => d.title), ["Ünal"]);
});

test("an empty search keeps the list as it is, and a miss finds nothing", () => {
  assert.equal(filterDialogs(dialogs, ""), dialogs);
  assert.equal(filterDialogs(dialogs, "   "), dialogs);
  assert.deepEqual(filterDialogs(dialogs, "zzz"), []);
});

test("names the type, and the members of a group", () => {
  assert.equal(dialogMeta({ type: "user" }), "Personal");
  assert.equal(dialogMeta({ type: "channel", participants_count: 90 }), "Channel");
  assert.equal(dialogMeta({ type: "group", participants_count: 1240 }), "Group · 1,240 members");
  assert.equal(dialogMeta({ type: "group", participants_count: 1 }), "Group · 1 member");
});

test("a group Telegram gave no member count for shows only its type", () => {
  assert.equal(dialogMeta({ type: "group" }), "Group");
  assert.equal(dialogMeta({ type: "group", participants_count: null }), "Group");
  assert.equal(dialogMeta({ type: "bot" }), "Chat");
});

test("the removal sentence says what goes and that Telegram is untouched", () => {
  assert.equal(
    telegramChatRemoveSummary({ title: "Tim Marketing", chat_collection_id: "a", message_count: 640 }),
    "Removes 'Tim Marketing' and its 640 stored messages from DocuLens. Your Telegram chat is not affected.",
  );
});

test("one message reads in the singular and thousands get a separator", () => {
  assert.equal(
    telegramChatRemoveSummary({ title: "A", chat_collection_id: "a", message_count: 1 }),
    "Removes 'A' and its 1 stored message from DocuLens. Your Telegram chat is not affected.",
  );
  assert.match(telegramChatRemoveSummary({ title: "A", chat_collection_id: "a", message_count: 12400 }), /its 12,400 stored messages/);
});

test("a chat synced before counts were saved does not claim a number", () => {
  assert.equal(
    telegramChatRemoveSummary({ title: "Old", chat_collection_id: "a", message_count: null }),
    "Removes 'Old' and its stored messages from DocuLens. Your Telegram chat is not affected.",
  );
});

test("a chat that was picked but never synced has nothing stored", () => {
  assert.equal(
    telegramChatRemoveSummary({ title: "New", chat_collection_id: "", message_count: 9 }),
    "Removes 'New' from this connection. Your Telegram chat is not affected.",
  );
});

test("a chat shows how many messages it stores", () => {
  assert.equal(storedMessagesLabel(640), "640 messages stored");
  assert.equal(storedMessagesLabel(1), "1 message stored");
  assert.equal(storedMessagesLabel(12400), "12,400 messages stored");
  assert.equal(storedMessagesLabel(0), "0 messages stored");
});

test("a chat with no saved count does not claim zero", () => {
  assert.equal(storedMessagesLabel(null), "Message count not saved yet");
  assert.equal(storedMessagesLabel(undefined), "Message count not saved yet");
});
