/**
 * Firebase initialization module
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

/**
 * Firebase project configuration.
 * Replace these values with your project's Firebase config from the console.
 */
const firebaseConfig = {
  apiKey: "AIzaSyANZjfo2o7rb29gVpziYLTzM3VewMG-5Ss",
  authDomain: "dnd2e-grimoire.firebaseapp.com",
  projectId: "dnd2e-grimoire",
  storageBucket: "dnd2e-grimoire.firebasestorage.app",
  messagingSenderId: "1035773100850",
  appId: "1:1035773100850:web:66c7c419e7305e3ee90d2b",
  measurementId: "G-S3Q2S9W9QL",
};

/** The initialized Firebase app */
export const app: FirebaseApp = initializeApp(firebaseConfig);

/** Firebase Authentication instance */
export const auth: Auth = getAuth(app);

/** Firestore database instance */
export const db: Firestore = getFirestore(app);
