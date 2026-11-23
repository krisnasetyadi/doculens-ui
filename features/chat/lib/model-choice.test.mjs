import assert from "node:assert/strict";
import { test } from "node:test";
import { chosenModel } from "./model-choice.ts";

const FALLBACK = { provider: "gemini", model: "gemini-flash-latest" };
const GPT = { provider: "openai", model: "gpt-5.4-mini" };

function server(defaultProvider, defaultModel, models) {
  return { default_provider: defaultProvider, default_model: defaultModel, available_models: models, usage_hint: "" };
}

const WITH_GPT = server("gemini", "gemini-flash-latest", {
  gemini: ["gemini-flash-latest", "gemini-2.5-flash"],
  openai: ["gpt-5.4-mini", "gpt-6.1-terra"],
});
const WITHOUT_GPT = server("gemini", "gemini-flash-latest", { gemini: ["gemini-flash-latest", "gemini-2.5-flash"] });

test("before the model list has loaded, the fallback is used even with a saved pick", () => {
  assert.deepEqual(chosenModel(GPT, null, FALLBACK), FALLBACK);
});

test("a saved pick the server lists is kept", () => {
  assert.deepEqual(chosenModel(GPT, WITH_GPT, FALLBACK), GPT);
});

test("without a saved pick the server's default applies", () => {
  assert.deepEqual(chosenModel(null, WITH_GPT, FALLBACK), FALLBACK);
  const gptDefault = server("openai", "gpt-5.4-mini", WITH_GPT.available_models);
  assert.deepEqual(chosenModel(null, gptDefault, FALLBACK), GPT);
});

test("a saved pick the server no longer lists falls back to the server's default", () => {
  assert.deepEqual(chosenModel(GPT, WITHOUT_GPT, FALLBACK), FALLBACK);
  assert.deepEqual(chosenModel({ provider: "gemini", model: "gemini-1.0-retired" }, WITH_GPT, FALLBACK), FALLBACK);
});

test("a server default that is not in its own list gives the first model the dropdown offers", () => {
  const unlistedDefault = server("openai", "gpt-unknown", { gemini: ["gemini-2.5-flash"], openai: ["gpt-5.4-mini"] });
  assert.deepEqual(chosenModel(null, unlistedDefault, FALLBACK), { provider: "gemini", model: "gemini-2.5-flash" });
  const noKeyGptDefault = server("openai", "gpt-5.4-mini", { gemini: ["gemini-2.5-flash"] });
  assert.deepEqual(chosenModel(null, noKeyGptDefault, FALLBACK), { provider: "gemini", model: "gemini-2.5-flash" });
});

test("an empty list falls back", () => {
  assert.deepEqual(chosenModel(GPT, server("gemini", "x", {}), FALLBACK), FALLBACK);
});

test("a malformed saved value from storage is ignored", () => {
  for (const junk of [{}, { provider: "openai" }, { provider: "nope", model: "gpt-5.4-mini" }, { provider: "openai", model: 5 }]) {
    assert.deepEqual(chosenModel(junk, WITH_GPT, FALLBACK), FALLBACK);
  }
});

test("the result is a fresh object, not the saved one", () => {
  const saved = { ...GPT, extra: "kept out" };
  assert.deepEqual(chosenModel(saved, WITH_GPT, FALLBACK), GPT);
});
