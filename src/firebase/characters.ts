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
  deleteField,
  CollectionReference,
  DocumentReference,
  onSnapshot,
  FieldPath,
  type Unsubscribe,
} from "firebase/firestore";
import type { Character } from "../types/Character";
import {
  PreparedSpellCounts,
  SpellSlotModifier,
} from "../types/ClassProgression";
import {
  WizardClassProgression,
  WizardSpellbook,
} from "../types/WizardClassProgression";
import { getCurrentUserId } from "./auth";
import { charactersAtom, store } from "../globalState";

let charactersRealtimeUnsub: Unsubscribe | null = null;

/**
 * Starts a Firestore real-time subscription for the current user's characters.
 * Keeps `charactersAtom` in sync across devices (and replays cached data offline).
 */
export function startCharactersRealtimeSync(): Unsubscribe {
  if (charactersRealtimeUnsub) {
    return charactersRealtimeUnsub;
  }

  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error("Not logged in");
  }

  const col = charactersCollection(uid);
  const q = query(col, orderBy("createdAt", "asc"));

  charactersRealtimeUnsub = onSnapshot(
    q,
    (snap) => {
      store.set(
        charactersAtom,
        snap.docs.map((d) => d.data()),
      );
    },
    (err) => {
      console.error("Characters realtime sync error:", err);
    },
  );

  return charactersRealtimeUnsub;
}

/** Stops the active characters real-time subscription (if any). */
export function stopCharactersRealtimeSync() {
  if (charactersRealtimeUnsub) {
    charactersRealtimeUnsub();
    charactersRealtimeUnsub = null;
  }
}

async function updateCharacterDoc(
  characterId: string,
  update: Partial<Character>,
): Promise<void> {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const ref = characterDoc(uid, characterId);
  await updateDoc(ref, {
    ...update,
    updatedAt: Date.now(),
  });
}

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
): Promise<string> {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error("Not logged in");
  }

  const col = charactersCollection(uid);
  const id = shortId();

  const char: Character = {
    ...data,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(col, id), char);

  return id;
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
export async function updateCharacter(id: string, data: Partial<Character>) {
  await updateCharacterDoc(id, data);
}

/** Firestore sentinel to remove a field in an update. */
export function firestoreDeleteField() {
  return deleteField();
}

/**
 * Update a character document by field path(s) (dot-path keys) without sending the full object.
 * Example: { "class.wizard.level": 2, "name": "Aragorn" }
 */
export async function updateCharacterFields(
  characterId: string,
  updates: Record<string, unknown>,
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const ref = characterDoc(uid, characterId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Create a new wizard spellbook for a character and persist it to Firestore.
 */
export async function addWizardSpellbook(
  characterId: string,
  spellbook: Omit<WizardSpellbook, "id" | "spellsById"> & { id?: string },
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.class.wizard;
  if (!wizard) throw new Error("Character has no wizard progression");

  const newSpellbook: WizardSpellbook = {
    id: spellbook.id ?? shortId(),
    name: spellbook.name,
    numberOfPages: spellbook.numberOfPages,
    spellsById: {},
  };

  const ref = characterDoc(uid, characterId);
  await updateDoc(
    ref,
    new FieldPath("class", "wizard", "spellbooksById", newSpellbook.id),
    newSpellbook,
    "updatedAt",
    Date.now(),
  );

  return newSpellbook;
}

/**
 * Add a spell to a specific wizard spellbook, persisting to Firestore and local state.
 */
export async function addSpellToWizardSpellbook(
  characterId: string,
  spellbookId: string,
  spellId: number | string,
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.class.wizard;
  if (!wizard) throw new Error("Character has no wizard progression");

  const spellbook = wizard.spellbooksById[spellbookId];
  if (!spellbook) throw new Error("Spellbook not found");

  const ref = characterDoc(uid, characterId);
  await updateDoc(
    ref,
    new FieldPath(
      "class",
      "wizard",
      "spellbooksById",
      spellbookId,
      "spellsById",
      String(spellId),
    ),
    true,
    "updatedAt",
    Date.now(),
  );

  return spellbook;
}

/**
 * Remove a spell from a specific wizard spellbook, persisting to Firestore.
 */
export async function removeSpellFromWizardSpellbook(
  characterId: string,
  spellbookId: string,
  spellId: number | string,
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.class.wizard;
  if (!wizard) throw new Error("Character has no wizard progression");

  const spellbook = wizard.spellbooksById[spellbookId];
  if (!spellbook) throw new Error("Spellbook not found");

  const ref = characterDoc(uid, characterId);
  await updateDoc(
    ref,
    new FieldPath(
      "class",
      "wizard",
      "spellbooksById",
      spellbookId,
      "spellsById",
      String(spellId),
    ),
    deleteField(),
    "updatedAt",
    Date.now(),
  );
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

  const wizard = existing.class.wizard;
  if (!wizard) throw new Error("Character has no wizard progression");

  const updatedWizard: WizardClassProgression = {
    ...wizard,
    level: changes.level ?? wizard.level,
    spellSlotModifiers:
      changes.spellSlotModifiers ?? wizard.spellSlotModifiers ?? [],
  };

  const updates: Record<string, unknown> = {};
  if (changes.level !== undefined) {
    updates["class.wizard.level"] = changes.level;
  }
  if (changes.spellSlotModifiers !== undefined) {
    updates["class.wizard.spellSlotModifiers"] = changes.spellSlotModifiers;
  }

  if (Object.keys(updates).length === 0) return updatedWizard;

  await updateCharacterFields(characterId, updates);
  return updatedWizard;
}

/**
 * Replace a wizard's prepared spells map and persist to Firestore.
 */
export async function updateWizardPreparedSpells(
  characterId: string,
  preparedSpells: Record<number, Record<string, PreparedSpellCounts>>,
) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not logged in");

  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.class.wizard;
  if (!wizard) throw new Error("Character has no wizard progression");

  const updatedWizard: WizardClassProgression = {
    ...wizard,
    preparedSpells,
  };

  await updateCharacterDoc(characterId, {
    class: {
      ...existing.class,
      wizard: updatedWizard,
    },
  });

  return updatedWizard;
}

/**
 * Update prepared spells for a single spell level.
 * Uses the latest character state from the jotai store to avoid stale props
 * during rapid UI interactions.
 */
export async function updateWizardPreparedSpellsLevel(
  characterId: string,
  spellLevel: number,
  levelSpells: Record<string, PreparedSpellCounts>,
) {
  const chars = store.get(charactersAtom);
  const existing = chars.find((c) => c.id === characterId);
  if (!existing) throw new Error("Character not found");

  const wizard = existing.class.wizard;
  if (!wizard) throw new Error("Character has no wizard progression");

  const preparedSpells = {
    ...(wizard.preparedSpells ?? {}),
    [spellLevel]: levelSpells,
  } as Record<number, Record<string, PreparedSpellCounts>>;

  return updateWizardPreparedSpells(characterId, preparedSpells);
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
}

function shortId(length = 6): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
}
