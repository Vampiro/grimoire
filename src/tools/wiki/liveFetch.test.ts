// @vitest-environment node
import { expect, test } from "vitest";
import { fetchAdnd2eWikiWikitext } from "./mediaWikiApi";
import { parseSpellWikitextToJson } from "./wikitextParser";

const runLive = process.env.VITEST_LIVE_FETCH === "1";

(runLive ? test : test.skip)(
  "live fetch: downloads and parses Fireball (opt-in)",
  async () => {
    const page = await fetchAdnd2eWikiWikitext("Fireball");
    const parsed = parseSpellWikitextToJson({
      title: page.title,
      wikitext: page.wikitext,
    });

    expect(parsed.wikitext.length).toBeGreaterThan(100);
    expect(Object.keys(parsed.sections).length).toBeGreaterThan(0);
  },
);
