import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./index";
import { useSetAtom } from "jotai";
import { userAtom } from "./authAtom";

/**
 * React hook to subscribe to Firebase auth state changes and update Jotai atom
 */
export function useAuthListener() {
  const setUser = useSetAtom(userAtom);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, [setUser]);
}
