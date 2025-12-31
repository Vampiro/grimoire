// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MediaWikiRevisionsResponse } from "./types";
import { extractFirstPageWikitext } from "./mediaWikiApi";

describe("extractFirstPageWikitext", () => {
  it("extracts wikitext from revisions response", () => {
    const json: MediaWikiRevisionsResponse = {
      query: {
        pages: {
          "123": {
            pageid: 123,
            title: "Fireball",
            revisions: [
              {
                slots: {
                  main: {
                    "*": "Hello wikitext",
                  },
                },
              },
            ],
          },
        },
      },
    };

    const page = extractFirstPageWikitext(json);
    expect(page.pageId).toBe(123);
    expect(page.title).toBe("Fireball");
    expect(page.wikitext).toBe("Hello wikitext");
  });

  it("throws when wikitext is missing", () => {
    const json: MediaWikiRevisionsResponse = {
      query: {
        pages: {
          "123": {
            pageid: 123,
            title: "Fireball",
            revisions: [{ slots: { main: {} } }],
          },
        },
      },
    };

    expect(() => extractFirstPageWikitext(json)).toThrow(
      /did not include wikitext/i,
    );
  });
});
