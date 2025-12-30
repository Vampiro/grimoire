import { type User } from "firebase/auth";
import { atom, getDefaultStore } from "jotai";
import { Character } from "./types/Character";
import type { Spell } from "./types/Spell";

/**
 * Global Jotai store instance.
 *
 * @remarks
 * This is used by a few non-React modules that need to read/write atoms outside
 * of components.
 */
export const store = getDefaultStore();
/**
 * Holds the currently authenticated Firebase user.
 *
 * - `null` if no user is logged in.
 * - `User` object from Firebase Auth if logged in.
 */
export const userAtom = atom<User | null>(null);

/** Atom for the user's characters. */
export const charactersAtom = atom<Character[]>([]);

/**
 * Load lifecycle state for runtime spell resources.
 *
 * @remarks
 * `ready` indicates the spell lists are available for synchronous reads.
 */
export type SpellDataStatus = {
  ready: boolean;
  loading: boolean;
  error: string | null;
};

/**
 * Tracks whether runtime spell resources have loaded.
 *
 * @remarks
 * UI can use this to display loading/error states while the spell JSON loads
 * (and potentially while IndexedDB/fetch fallbacks resolve).
 */
export const spellDataStatusAtom = atom<SpellDataStatus>({
  ready: false,
  loading: false,
  error: null,
});

/** Wizard spell list loaded at runtime (see `loadSpellData`). */
export const wizardSpellsAtom = atom<Spell[]>([]);
/** Priest spell list loaded at runtime (see `loadSpellData`). */
export const priestSpellsAtom = atom<Spell[]>([]);
