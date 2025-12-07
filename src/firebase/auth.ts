/** Firebase Google Authentication helpers. */

import { auth } from "./index";
import {
  signInWithPopup,
  GoogleAuthProvider,
  type User,
  signOut,
} from "firebase/auth";

/** Google provider instance */
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google using a popup
 * @returns Firebase User object
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Log out the currently authenticated user
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Get the currently logged-in user's UID.
 * Undefined if no user.
 */
export function getCurrentUserId(): string | undefined {
  const user = auth.currentUser;
  return user?.uid;
}
