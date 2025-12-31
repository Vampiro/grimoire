// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildWizardDescriptionsForFireball } from "./wizardDescriptionsCore";

describe("buildWizardDescriptionsForFireball", () => {
  it("builds an in-memory JSON output without writing files", async () => {
    const spells = [
      {
        level: 1,
        name: "Magic Missile",
        link: "https://adnd2e.fandom.com/wiki/Magic_Missile",
      },
      {
        level: 3,
        name: "Fireball",
        link: "https://adnd2e.fandom.com/wiki/Fireball",
      },
    ];

    const out = await buildWizardDescriptionsForFireball(spells, async () => ({
      title: "Fireball",
      wikitext: [
        "{{Infobox Spells",
        "|school = Evocation",
        "}}",
        "Intro.",
      ].join("\n"),
    }));

    expect(out.source).toBe("https://adnd2e.fandom.com");
    expect(out.generatedAt).toMatch(/T/);

    expect(Object.keys(out.spellsByName)).toEqual(["Fireball"]);
    expect(out.spellsByName.Fireball.title).toBe("Fireball");
    expect(out.spellsByName.Fireball.infobox.school).toBe("Evocation");
    expect(out.spellsByName.Fireball.html.length).toBeGreaterThan(0);
    expect(out.spellsByName.Fireball.sectionsHtml.Introduction.length).toBeGreaterThan(0);
  });
});
