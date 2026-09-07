import assert from "node:assert/strict";
import { test } from "node:test";
import { skillDetailsSchema } from "./skill-details-schema";

test("trims metadata without changing internal whitespace or line breaks", () => {
  assert.deepEqual(skillDetailsSchema.parse({
    name: "  Contract review  ",
    description: " \nCheck obligations.\nCite the source. \n",
  }), {
    name: "Contract review",
    description: "Check obligations.\nCite the source.",
  });
});

test("allows clearing the optional description and defaults omitted descriptions to an empty string", () => {
  for (const description of ["", " \t\n ", undefined]) {
    assert.deepEqual(skillDetailsSchema.parse({ name: "Review", description }), {
      name: "Review",
      description: "",
    });
  }
});

test("rejects empty and whitespace-only names", () => {
  for (const name of ["", " \t\n "]) {
    const result = skillDetailsSchema.safeParse({ name, description: "Review contracts" });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.error.issues[0].path, ["name"]);
      assert.equal(result.error.issues[0].message, "Enter a skill name.");
    }
  }
});

test("rejects nonstring names and descriptions rather than coercing them", () => {
  for (const value of [null, 42, true, [], {}]) {
    assert.equal(skillDetailsSchema.safeParse({ name: value, description: "" }).success, false);
    assert.equal(skillDetailsSchema.safeParse({ name: "Review", description: value }).success, false);
  }
  assert.equal(skillDetailsSchema.safeParse({ description: "Review contracts" }).success, false);
});
