import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  priestSpellDescriptionsAtom,
  priestSpellsAtom,
  store,
} from "@/globalState";
import { updatePriestPreparedSpellsLevel } from "@/firebase/characters";
import { CharacterClass } from "@/types/ClassProgression";
import type { PriestClassProgression } from "@/types/PriestClassProgression";
import { usePriestPreparedSpellsState } from "./priestPreparedSpellsState";

vi.mock("@/firebase/characters", () => ({
  updatePriestPreparedSpellsLevel: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/resourceCache", () => ({ getResourceCached: vi.fn() }));

const priest: PriestClassProgression = {
  className: CharacterClass.PRIEST,
  level: 5,
  preparedSpells: {},
  knownSpellsById: { "1": true, "3": true, "4": true, "5": true },
  majorSpheres: ["All", "Divination"],
  minorSpheres: ["Elemental"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  store.set(priestSpellsAtom, [
    { id: 1, name: "Known Divination", level: 1, spellClass: "priest" },
    { id: 2, name: "Unknown Divination", level: 1, spellClass: "priest" },
    { id: 3, name: "Known Animal", level: 1, spellClass: "priest" },
    { id: 4, name: "Minor Elemental", level: 3, spellClass: "priest" },
    { id: 5, name: "Higher Elemental", level: 4, spellClass: "priest" },
  ]);
  store.set(
    priestSpellDescriptionsAtom,
    Object.fromEntries(
      (
        [
          [1, ["Divination"]],
          [2, ["Divination"]],
          [3, ["Animal"]],
          [4, ["Elemental", "Elemental Water"]],
          [5, ["Elemental", "Elemental Water"]],
        ] as Array<[number, string[]]>
      ).map(([id, spheres]) => [
        String(id),
        {
          metadata: { name: String(id), source: "test", spheres },
          sections: {},
        },
      ]),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function renderState(progression = priest, spellLevel = 1) {
  return renderHook((props) => usePriestPreparedSpellsState(props), {
    initialProps: { progression, spellLevel, characterId: "priest" },
  });
}

describe("priest known spells preparation", () => {
  it("intersects knowledge, level and sphere access; All is not every sphere", () => {
    const { result, rerender } = renderState();
    expect(result.current.availableSpells.map(([id]) => id)).toEqual(["1"]);
    rerender({ progression: priest, spellLevel: 3, characterId: "priest" });
    expect(result.current.availableSpells.map(([id]) => id)).toEqual(["4"]);
    rerender({ progression: priest, spellLevel: 4, characterId: "priest" });
    expect(result.current.availableSpells).toEqual([]);
  });

  it("never falls back to the catalog for a missing or empty known list", () => {
    const { result, rerender } = renderState({
      ...priest,
      knownSpellsById: undefined,
    });
    expect(result.current.availableSpells).toEqual([]);
    rerender({
      progression: { ...priest, knownSpellsById: {} },
      spellLevel: 1,
      characterId: "priest",
    });
    expect(result.current.availableSpells).toEqual([]);
  });

  it("starts legacy knowledge with prepared spells only, including used copies", () => {
    const progression = {
      ...priest,
      knownSpellsById: undefined,
      preparedSpells: { 1: { "1": { total: 1, used: 1 } } },
    };
    const { result } = renderState(progression);
    expect([...result.current.eligibleSpellIds]).toEqual(["1"]);
    expect(result.current.availableSpells).toEqual([]);
  });

  it("allows only known spells even with no sphere filters configured", () => {
    const { result } = renderState({
      ...priest,
      majorSpheres: [],
      minorSpheres: [],
    });
    expect(result.current.availableSpells.map(([id]) => id)).toEqual([
      "3",
      "1",
    ]);
  });

  it("guards add and increase actions, including spells removed from knowledge", () => {
    const { result, rerender } = renderState();
    act(() => {
      result.current.handleAddSpell("2");
      result.current.handleAddSpell("3");
      result.current.handleIncreaseCopies("2");
    });
    expect(updatePriestPreparedSpellsLevel).not.toHaveBeenCalled();
    act(() => result.current.handleAddSpell("1"));
    expect(result.current.spells["1"]).toEqual({ total: 1, used: 0 });
    expect(updatePriestPreparedSpellsLevel).toHaveBeenLastCalledWith(
      "priest",
      1,
      { "1": { total: 1, used: 0 } },
    );
    const progression = {
      ...priest,
      knownSpellsById: {},
      preparedSpells: { 1: { "1": { total: 1, used: 0 } } },
    };
    rerender({ progression, spellLevel: 1, characterId: "priest" });
    vi.mocked(updatePriestPreparedSpellsLevel).mockClear();
    act(() => result.current.handleIncreaseCopies("1"));
    expect(updatePriestPreparedSpellsLevel).not.toHaveBeenCalled();
    expect(result.current.spells["1"]).toEqual({ total: 1, used: 0 });
    act(() => result.current.adjustRemaining("1", -1));
    expect(result.current.spells["1"].used).toBe(1);
    act(() => result.current.deleteSpellGroup("1"));
    expect(result.current.spells).toEqual({});
  });
});
