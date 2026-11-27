import assert from "node:assert/strict";
import { test } from "node:test";
import { guideSourceFromUrl, guideSourceLocation } from "./guide-source-link.ts";

const base = "http://127.0.0.1:8020";

test("a citation restores the authenticated viewer's collection, file and page", () => {
  const source = guideSourceFromUrl(`${base}/api/v1/files/c1/Project%20Brief.pdf#page=4`, base);
  assert.equal(source.file_name, "Project Brief.pdf");
  assert.equal(source.collection_id, "c1");
  assert.equal(source.page, 4);
  assert.equal(source.file_url, `${base}/api/v1/files/c1/Project%20Brief.pdf`);
  assert.equal(guideSourceFromUrl("/api/v1/files/c1/deck.pptx#page=3", base).page, 3);
});

test("external or malformed links cannot send the auth header to another origin", () => {
  for (const href of ["https://attacker.test/api/v1/files/c1/a.pdf", "javascript:alert(1)",
    `${base}/api/v1/files/c1/a.pdf?token=anything`, `${base}/api/v1/files/c1/a.pdf#page=0`,
    `${base}/api/v1/files/c1/a.pdf#page=oops`, `${base}/api/v1/files/c1/%2Fsecret`,
    "http://user:password@127.0.0.1:8020/api/v1/files/c1/a.pdf", undefined]) {
    assert.equal(guideSourceFromUrl(href, base), null, href);
  }
});

test("English and multiple locations use the server labels without reformatting", () => {
  assert.equal(guideSourceLocation("p. 1; p. 4", 0), "p. 1");
  assert.equal(guideSourceLocation("p. 1; p. 4", 1), "p. 4");
  assert.equal(guideSourceLocation("document", 0), "document");
  assert.equal(guideSourceLocation("slide 3", 0), "slide 3");
});

test("HF links with HTTP scheme use the HTTPS API origin for the same host", () => {
  const api = "https://doculens.hf.space";
  const source = guideSourceFromUrl("http://doculens.hf.space/api/v1/files/c1/Brief.pdf#page=4", api);
  assert.ok(source);
  assert.equal(source.file_url, `${api}/api/v1/files/c1/Brief.pdf`);
  assert.equal(source.page_url, `${api}/api/v1/files/c1/Brief.pdf#page=4`);
  assert.equal(source.page, 4);
});

test("matching explicit ports are accepted across HTTP and HTTPS", () => {
  const source = guideSourceFromUrl("http://api.example:8443/api/v1/files/c1/a.pdf", "https://api.example:8443");
  assert.ok(source);
  assert.equal(source.file_url, "https://api.example:8443/api/v1/files/c1/a.pdf");
});

test("scheme normalization never accepts another host, port, credentials or query", () => {
  const api = "https://doculens.hf.space";
  for (const href of ["http://other.hf.space/api/v1/files/c1/a.pdf", "http://doculens.hf.space:8443/api/v1/files/c1/a.pdf",
    "http://user:password@doculens.hf.space/api/v1/files/c1/a.pdf", "http://doculens.hf.space/api/v1/files/c1/a.pdf?key=value",
    "ftp://doculens.hf.space/api/v1/files/c1/a.pdf"]) {
    assert.equal(guideSourceFromUrl(href, api), null, href);
  }
});
