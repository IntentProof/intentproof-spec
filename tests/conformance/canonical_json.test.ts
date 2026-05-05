import { describe, expect, it } from "vitest";
import { canonicalJsonStringify, sortJsonValue } from "../../tools/canonical/canonical-json.js";

describe("canonicalJson", () => {
  it("sorts object keys deterministically", () => {
    const a = sortJsonValue({ z: 1, a: { m: 2, b: 1 } });
    expect(JSON.stringify(a)).toBe('{"a":{"b":1,"m":2},"z":1}');
  });

  it("stringify ends with newline", () => {
    expect(canonicalJsonStringify({ b: 1, a: 2 })).toMatch(/\n$/);
  });
});
