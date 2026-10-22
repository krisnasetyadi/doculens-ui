import assert from "node:assert/strict";
import { test } from "node:test";
import { isInternationalPhone } from "./telegram-phone.ts";

test("accepts international numbers, with or without separators", () => {
  for (const phone of ["+6282122227914", "+62 821 2222 7914", " +62-821-2222-7914 ", "+1 (415) 555-0100"]) {
    assert.equal(isInternationalPhone(phone), true, phone);
  }
});

test("refuses a local number without the country code", () => {
  for (const phone of ["082122227914", "0821 2222 7914", "6282122227914"]) {
    assert.equal(isInternationalPhone(phone), false, phone);
  }
});

test("refuses text and numbers that are too short", () => {
  for (const phone of ["", "+", "+62 12", "+62 abc 123", "62+821222"]) {
    assert.equal(isInternationalPhone(phone), false, phone);
  }
});
