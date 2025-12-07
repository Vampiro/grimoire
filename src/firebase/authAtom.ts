/**
 * Jotai atom for storing the currently authenticated Firebase user.
 */

import { atom } from 'jotai';
import type { User } from 'firebase/auth';

/**
 * Holds the currently authenticated Firebase user.
 * 
 * - `null` if no user is logged in.
 * - `User` object from Firebase Auth if logged in.
 */
export const userAtom = atom<User | null>(null);
