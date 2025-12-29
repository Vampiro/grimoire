/**
 * Character-related Firestore helpers
 */

import { db } from "./index";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  getDoc,
} from "firebase/firestore";
import type { Character } from "../types/Character";
import {
  CharacterClass,
  PreparedSpell,
  WizardClassProgression,
  WizardSpellbook,
  SpellSlotModifier,
} from "../types/ClassProgression";
import { getCurrentUserId } from "./auth";
import { charactersAtom, store } from "../globalState";

/**
 * Returns the collection reference for a user's characters
 */
function charactersCollection(uid: string) {
  return collection(
    db,
    "users",
    uid,
    "characters",
  ) as CollectionReference<Character>;
}

/**
 * Get reference to a specific character document.
 * @param characterId - Character document ID
 */
function characterDoc(uid: string, characterId: string) {
  return doc(
    db,
    `users/${uid}/characters/${characterId}`,
  ) as DocumentReference<Character>;
}

/**
 * Creates a new character for the user
 */
export async function createCharacter(
  data: Omit<Character, "id" | "createdAt" | "updatedAt">,
) {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error("Not logged in");
  }

  const col = charactersCollection(uid);
  const id = shortId();

  const char: Character = {
    ...data,
    id,
    revision: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(col, id), char);

  const chars = store.get(charactersAtom);
  store.set(charactersAtom, [...chars, char]);
}

/**
 * Gets all characters.
 * @returns All characters.
 */
async function getCharacters(): Promise<Character[]> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error("Not logged in");
  }

  const col = charactersCollection(uid);
  const q = query(col, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => d.data());
}

/** Tracks in-flight refresh promise to deduplicate concurrent calls */
let refreshPromise: Promise<void> | null = null;

/**
 * Refreshes the global state list of characters.
 * If a refresh is already in progress, returns that promise instead of starting a new one.
 */
export function refreshCharacters(): Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const chars = await getCharacters();
      store.set(charactersAtom, chars);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Updates a character in the Firestore database.
 * @param id ID of the character.
 * @param data Attributes to update.
 */
export async function updateCharacter(
  id: string,
  data: Partial<Character> & { revision: number },
) {
  updateCharacterWithRevisionCheck(id, data);
  // const uid = getCurrentUserId();
  // if (!uid) {
  //   throw new Error("Not logged in");
  // }

  // const ref = doc(db, "users", uid, "characters", id);
  // const updatedAt = Date.now();
  // await updateDoc(ref, {
  //   ...data,
  //   updatedAt,
  // });

  // const chars = store.get(charactersAtom);
  // const char = chars.find((c) => c.id === id);
  // if (char) {
  //   const newChars = chars.filter((c) => c.id !== id);
  //   const updatedChar: Character = {
  //     ...char,
  //     ...data,
  //     updatedAt,
  //   };
  //   newChars.push(updatedChar);
  //   store.set(
  //     charactersAtom,
  //     chars.filter((c) => c.id !== id),
  //   );
  // }
}

async function updateCharacterWithRevisionCheck(
  id: string,
  update: Partial<Character> & { revision: number },
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const ref = characterDoc(uid, id);

  try {
    await updateDoc(ref, update);
    return { ok: true };
  } catch (err: any) {
    if (err.code === "permission-denied") {
      // Fetch server state to see WHY it was denied
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return { ok: false, deleted: true };
      }

      const serverRevision = snap.data().revision;

      if (update.revision !== serverRevision + 1) {
        return {
          ok: false,
          conflict: true,
          serverRevision,
          expectedRevision: serverRevision + 1,
        };
      }
    }

    // Unknown or network error
    return { ok: false, error: err };
  }
}

/**
 * Create a new wizard spellbook for a character and persist it to Firestore.
 */
export async function addWizardSpellbook(
  characterId: string,
  spellbook: Omit<WizardSpellbook, "id" | "spells"> & {
    id?: string;
    spells?: string[];
  },
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.classes.find(
    (c) => c.className === CharacterClass.WIZARD,
  ) as WizardClassProgression | undefined;
  if (!wizard) throw new Error("Character has no wizard progression");

  const newSpellbook: WizardSpellbook = {
    id: spellbook.id ?? shortId(),
    name: spellbook.name,
    numberOfPages: spellbook.numberOfPages,
    spells: spellbook.spells ?? [],
  };

  const updatedWizard: WizardClassProgression = {
    ...wizard,
    spellbooks: [...wizard.spellbooks, newSpellbook],
  };

  const updatedClasses = existing.classes.map((c) =>
    c.className === CharacterClass.WIZARD ? updatedWizard : c,
  );

  const revision = existing.revision + 1;
  const updatedAt = Date.now();

  const result = await updateCharacterWithRevisionCheck(characterId, {
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  });

  if (result.ok === false) {
    throw new Error("Failed to update character with new spellbook");
  }

  // Update local state to reflect the new spellbook immediately
  const updatedChar: Character = {
    ...existing,
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  };

  store.set(
    charactersAtom,
    chars.map((c) => (c.id === characterId ? updatedChar : c)),
  );

  return newSpellbook;
}

/**
 * Add a spell to a specific wizard spellbook, persisting to Firestore and local state.
 */
export async function addSpellToWizardSpellbook(
  characterId: string,
  spellbookId: string,
  spellId: string,
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.classes.find(
    (c) => c.className === CharacterClass.WIZARD,
  ) as WizardClassProgression | undefined;
  if (!wizard) throw new Error("Character has no wizard progression");

  const spellbook = wizard.spellbooks.find((sb) => sb.id === spellbookId);
  if (!spellbook) throw new Error("Spellbook not found");

  if (spellbook.spells.includes(spellId)) {
    return spellbook; // already present; no-op
  }

  const updatedSpellbook: WizardSpellbook = {
    ...spellbook,
    spells: [...spellbook.spells, spellId],
  };

  const updatedWizard: WizardClassProgression = {
    ...wizard,
    spellbooks: wizard.spellbooks.map((sb) =>
      sb.id === spellbookId ? updatedSpellbook : sb,
    ),
  };

  const updatedClasses = existing.classes.map((c) =>
    c.className === CharacterClass.WIZARD ? updatedWizard : c,
  );

  const revision = existing.revision + 1;
  const updatedAt = Date.now();

  const result = await updateCharacterWithRevisionCheck(characterId, {
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  });

  if (result.ok === false) {
    throw new Error("Failed to add spell to spellbook");
  }

  const updatedChar: Character = {
    ...existing,
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  };

  store.set(
    charactersAtom,
    chars.map((c) => (c.id === characterId ? updatedChar : c)),
  );

  return updatedSpellbook;
}

/** Update wizard level and/or spell slot modifiers. */
export async function updateWizardProgression(
  characterId: string,
  changes: {
    level?: number;
    spellSlotModifiers?: SpellSlotModifier[];
  },
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.classes.find(
    (c) => c.className === CharacterClass.WIZARD,
  ) as WizardClassProgression | undefined;
  if (!wizard) throw new Error("Character has no wizard progression");

  const updatedWizard: WizardClassProgression = {
    ...wizard,
    level: changes.level ?? wizard.level,
    spellSlotModifiers:
      changes.spellSlotModifiers ?? wizard.spellSlotModifiers ?? [],
  };

  const updatedClasses = existing.classes.map((c) =>
    c.className === CharacterClass.WIZARD ? updatedWizard : c,
  );

  const revision = existing.revision + 1;
  const updatedAt = Date.now();

  const result = await updateCharacterWithRevisionCheck(characterId, {
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  });

  if (result.ok === false) {
    throw new Error("Failed to update wizard progression");
  }

  const updatedChar: Character = {
    ...existing,
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  };

  store.set(
    charactersAtom,
    chars.map((c) => (c.id === characterId ? updatedChar : c)),
  );

  return updatedWizard;
}

/**
 * Replace a wizard's prepared spells map and persist to Firestore.
 */
export async function updateWizardPreparedSpells(
  characterId: string,
  preparedSpells: Record<number, PreparedSpell[]>,
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.classes.find(
    (c) => c.className === CharacterClass.WIZARD,
  ) as WizardClassProgression | undefined;
  if (!wizard) throw new Error("Character has no wizard progression");

  const updatedWizard: WizardClassProgression = {
    ...wizard,
    preparedSpells,
  };

  const updatedClasses = existing.classes.map((c) =>
    c.className === CharacterClass.WIZARD ? updatedWizard : c,
  );

  const revision = existing.revision + 1;
  const updatedAt = Date.now();

  const result = await updateCharacterWithRevisionCheck(characterId, {
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  });

  if (result.ok === false) {
    throw new Error("Failed to update wizard prepared spells");
  }

  const updatedChar: Character = {
    ...existing,
    classes: updatedClasses as Character["classes"],
    revision,
    updatedAt,
  };

  store.set(
    charactersAtom,
    chars.map((c) => (c.id === characterId ? updatedChar : c)),
  );

  return updatedWizard;
}

/**
 * Delete a character document for a given user.
 *
 * @param id - The ID of the character to delete
 */
export async function deleteCharacter(id: string): Promise<void> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error("Not logged in");
  }

  const ref = characterDoc(uid, id);
  await deleteDoc(ref);

  const chars = store.get(charactersAtom);
  store.set(
    charactersAtom,
    chars.filter((c) => c.id !== id),
  );
}

function shortId(length = 6): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
}
