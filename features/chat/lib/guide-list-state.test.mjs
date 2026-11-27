import assert from "node:assert/strict";
import test from "node:test";
import { pinnedGuideReply, stripListState } from "./guide-list-state.ts";

test("the carried list state is removed from what is shown or copied", () => {
  const reply = 'Berikutnya: **c. Arsitektur Sistem** (hlm 3)\n\n[lens-list]: # "eyJ2IjoxfQ"';
  assert.equal(stripListState(reply), "Berikutnya: **c. Arsitektur Sistem** (hlm 3)");
});

test("a reply without state is unchanged", () => {
  assert.equal(stripListState("Halo!\n\nApa kabar?"), "Halo!\n\nApa kabar?");
});

const turn = (role, content) => ({ role, content });
const STATE = 'Berikutnya: **b.**\n\n[lens-list]: # "eyJ2IjoxfQ"';

test("the newest guide reply older than the history window is pinned", () => {
  const all = [turn("user", "q0"), turn("assistant", STATE + "1"), turn("user", "q1"), turn("assistant", STATE + "2"),
    turn("user", "q2"), turn("assistant", "jawaban"), turn("user", "q3"), turn("assistant", "jawaban")];
  assert.equal(pinnedGuideReply(all, 4), all[3]);
  assert.equal(pinnedGuideReply(all, 3), all[1]);
});

test("nothing is pinned when the list is inside the window or in a user message", () => {
  const all = [turn("user", STATE), turn("assistant", "jawaban"), turn("user", "q"), turn("assistant", STATE)];
  assert.equal(pinnedGuideReply(all, 2), null);
  assert.equal(pinnedGuideReply([turn("assistant", "tanpa state")], 1), null);
});
