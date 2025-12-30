/**
 * Firebase initialization module
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

/**
 * Firebase project configuration.
 * Replace these values with your project's Firebase config from the console.
 *
 * Note: These are not considered secrets.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/** The initialized Firebase app */
export const app: FirebaseApp = initializeApp(firebaseConfig);

/** Firebase Authentication instance */
export const auth: Auth = getAuth(app);

/** Firestore database instance */
export const db: Firestore = (() => {
  try {
    // Enables IndexedDB-backed persistence so the app can read/write while offline
    // and sync changes when connectivity returns.
    // Falls back to in-memory cache if persistence is not available (e.g. some
    // private browsing modes or older browsers).
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (err) {
    console.warn(
      "Firestore persistence unavailable; falling back to in-memory cache:",
      err,
    );
    return getFirestore(app);
  }
})();
