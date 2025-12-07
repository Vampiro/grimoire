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
} from "firebase/firestore";
import type { Character } from "../types/Character";
import { getCurrentUid } from "./auth";

/**
 * Returns the collection reference for a user's characters
 */
function charactersCollection() {
  const uid = getCurrentUid();
  return collection(db, "users", uid, "characters");
}

/**
 * Get reference to a specific character document.
 * @param characterId - Character document ID
 */
export function characterDoc(characterId: string) {
  const uid = getCurrentUid();
  return doc(db, `users/${uid}/characters/${characterId}`);
}

/**
 * Creates a new character for the user
 */
export async function createCharacter(
  data: Omit<Character, "id" | "createdAt" | "updatedAt">,
) {
  const col = charactersCollection();
  const id = crypto.randomUUID();

  const char: Character = {
    ...data,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(col, id), char);

  return char;
}

/**
 * Loads all characters for a user
 */
export async function getCharacters(): Promise<Character[]> {
  const col = charactersCollection();
  const q = query(col, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => d.data() as Character);
}

/**
 * Update a character
 */
export async function updateCharacter(id: string, data: Partial<Character>) {
  const uid = getCurrentUid();
  const ref = doc(db, "users", uid, "characters", id);
  await updateDoc(ref, {
    ...data,
    updatedAt: Date.now(),
  });
}

/**
 * Delete a character document for a given user.
 *
 * @param characterId - The ID of the character to delete
 * @returns Promise<void>
 */
export async function deleteCharacter(characterId: string): Promise<void> {
  const ref = characterDoc(characterId);
  await deleteDoc(ref);
}
