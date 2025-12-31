// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseSpellWikitextToJson } from "./wikitextParser";

describe("parseSpellWikitextToJson", () => {
  it("parses infobox fields and sections; ignores category lines", () => {
    const wikitext = [
      "{{Infobox Spells",
      "|school = Evocation",
      "|level = 3",
      "}}",
      "This is the introduction.",
      "[[Category:Wizard Spells]]",
      "==Combat & Tactics==",
      "Use it carefully.",
    ].join("\n");

    const parsed = parseSpellWikitextToJson({ title: "Fireball", wikitext });

    expect(parsed.title).toBe("Fireball");
    expect(parsed.infobox.school).toBe("Evocation");
    expect(parsed.infobox.level).toBe("3");

    expect(parsed.sections.Introduction).toContain("This is the introduction.");
    expect(parsed.sections["Combat & Tactics"]).toContain("Use it carefully.");

    expect(parsed.sections.Introduction).not.toContain("Category:");
    expect(parsed.sections["Combat & Tactics"]).not.toContain("Category:");

    // HTML output (via wtf-plugin-html) should be present and usable.
    expect(parsed.html.length).toBeGreaterThan(0);
    expect(parsed.sectionsHtml.Introduction.length).toBeGreaterThan(0);
    expect(parsed.sectionsHtml["Combat & Tactics"]).toContain(
      "<h1>Combat & Tactics</h1>",
    );
  });
});
