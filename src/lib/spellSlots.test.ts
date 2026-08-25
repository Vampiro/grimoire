import { describe, expect, it } from "vitest";

import {
  getHighestAvailableSpellLevel,
  getPriestSpellSlots,
} from "@/lib/spellSlots";

describe("getHighestAvailableSpellLevel", () => {
  it("uses spell slots rather than the caster's class level", () => {
    expect(getHighestAvailableSpellLevel(getPriestSpellSlots(5))).toBe(3);
  });

  it("includes spell levels granted by slot modifiers", () => {
    const slots = getPriestSpellSlots(5, [
      {
        addBase: false,
        bonus: 1,
        requiresSpellLevelAccess: false,
        spellLevel: 5,
      },
    ]);

    expect(getHighestAvailableSpellLevel(slots)).toBe(5);
  });

  it("returns zero when no slots are available", () => {
    expect(getHighestAvailableSpellLevel({ 1: 0, 2: 0 })).toBe(0);
  });
});
