import { type User } from "firebase/auth";
import { atom, getDefaultStore } from "jotai";
import { Character } from "./types/Character";

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
