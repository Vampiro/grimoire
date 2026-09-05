import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateDoc, deleteField } from "firebase/firestore";
import { getCurrentUserId } from "./auth";
import { charactersAtom, store } from "@/globalState";
import { CharacterClass } from "@/types/ClassProgression";
import type { PriestClassProgression } from "@/types/PriestClassProgression";
import {
  addPriestKnownSpell,
  removePriestKnownSpell,
  updatePriestPreparedSpellsLevel,
} from "./characters";

vi.mock("./index", () => ({ db: {} }));
vi.mock("./auth", () => ({ getCurrentUserId: vi.fn(() => "user") }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => "character-document"),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(() => "delete-field"),
}));

function setPriest(
  knownSpellsById?: PriestClassProgression["knownSpellsById"],
) {
  store.set(charactersAtom, [
    {
      id: "priest",
      name: "Priest",
      createdAt: 0,
      updatedAt: 0,
      class: {
        priest: {
          className: CharacterClass.PRIEST,
          level: 5,
          knownSpellsById,
          preparedSpells: { 1: { "1": { total: 1, used: 1 } } },
        },
      },
    },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUserId).mockReturnValue("user");
  setPriest();
});

describe("priest known spells persistence", () => {
  it("initializes legacy knowledge from prepared spells on first add", async () => {
    await addPriestKnownSpell("priest", 2);
    expect(updateDoc).toHaveBeenCalledWith("character-document", {
      "class.priest.knownSpellsById": { "1": true, "2": true },
      updatedAt: expect.any(Number),
    });
  });

  it("updates individual knowledge fields after initialization", async () => {
    setPriest({});
    await addPriestKnownSpell("priest", 2);
    expect(updateDoc).toHaveBeenLastCalledWith("character-document", {
      "class.priest.knownSpellsById.2": true,
      updatedAt: expect.any(Number),
    });
    setPriest({ "2": true });
    await removePriestKnownSpell("priest", 2);
    expect(updateDoc).toHaveBeenLastCalledWith("character-document", {
      "class.priest.knownSpellsById.2": deleteField(),
      updatedAt: expect.any(Number),
    });
  });

  it("persists an explicitly empty list when the last legacy spell is removed", async () => {
    await removePriestKnownSpell("priest", 1);
    expect(updateDoc).toHaveBeenCalledWith("character-document", {
      "class.priest.knownSpellsById": {},
      updatedAt: expect.any(Number),
    });
    expect(
      store.get(charactersAtom)[0].class.priest?.preparedSpells[1]["1"],
    ).toEqual({ total: 1, used: 1 });
  });

  it("preserves legacy knowledge when its last prepared copy is removed", async () => {
    await updatePriestPreparedSpellsLevel("priest", 1, {});
    expect(updateDoc).toHaveBeenCalledWith("character-document", {
      "class.priest.preparedSpells": { 1: {} },
      "class.priest.knownSpellsById": { "1": true },
      updatedAt: expect.any(Number),
    });
  });

  it("does not overwrite an established known list when preparation changes", async () => {
    setPriest({});
    await updatePriestPreparedSpellsLevel("priest", 1, {});
    expect(updateDoc).toHaveBeenCalledWith("character-document", {
      "class.priest.preparedSpells": { 1: {} },
      updatedAt: expect.any(Number),
    });
  });

  it("rejects unauthorized or non-priest changes", async () => {
    vi.mocked(getCurrentUserId).mockReturnValue(undefined);
    await expect(addPriestKnownSpell("priest", 2)).rejects.toThrow(
      "Not logged in",
    );
    await expect(removePriestKnownSpell("missing", 2)).rejects.toThrow(
      "Character not found",
    );
    store.set(charactersAtom, [
      { id: "other", name: "Other", class: {}, createdAt: 0, updatedAt: 0 },
    ]);
    await expect(addPriestKnownSpell("other", 2)).rejects.toThrow(
      "no priest progression",
    );
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
