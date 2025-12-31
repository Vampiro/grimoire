// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cleanupWtfHtml } from "./htmlCleanup";

describe("cleanupWtfHtml", () => {
  it("collapses redundant nested italic/bold tags", () => {
    const input =
      "<p>the <i><i><i>fireball</i></i></i> ignites <b><b>stuff</b></b></p>";
    const out = cleanupWtfHtml(input);
    expect(out).toBe("<p>the <i>fireball</i> ignites <b>stuff</b></p>");
  });
});
