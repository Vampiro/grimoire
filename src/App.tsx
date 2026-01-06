import { useAtomValue } from "jotai";
import "./App.css";
import {
  spellDataStatusAtom,
  store,
  uiScaleAtom,
  userAtom,
} from "./globalState";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import {
  refreshCharacters,
  startCharactersRealtimeSync,
  stopCharactersRealtimeSync,
} from "./firebase/characters";
import { Route, Routes } from "react-router-dom";
import { CharactersPage } from "./pages/CharactersPage";
import { CharacterPage } from "./pages/CharacterPage";
import { CharacterEditPage } from "./pages/CharacterEditPage";
import { WizardSpellSlotsPage } from "./pages/WizardSpellSlotsPage";
import { WizardSpellbooksPage } from "./pages/WizardSpellbooksPage";
import { Navbar } from "./components/custom/Navbar";
import { Toaster } from "sonner";
import { charactersAtom } from "./globalState";
import { loadSpellData } from "./lib/spellLookup";
import { SettingsPage } from "./pages/SettingsPage";
import { subscribeToUserSettings } from "./firebase/userSettings";
import { SpellViewerDialog } from "./components/custom/SpellViewerDialog";

/** Root application component. */
function App() {
  const user = useAtomValue(userAtom);
  const spellStatus = useAtomValue(spellDataStatusAtom);
  const uiScale = useAtomValue(uiScaleAtom);

  useEffect(() => {
    const clamped = Math.min(1.5, Math.max(0.75, uiScale));
    document.documentElement.style.fontSize = `${clamped * 100}%`;
  }, [uiScale]);

  useEffect(() => {
    let cancelled = false;

    store.set(spellDataStatusAtom, {
      ready: false,
      loading: true,
      error: null,
    });

    void loadSpellData()
      .then(() => {
        if (cancelled) return;
        store.set(spellDataStatusAtom, {
          ready: true,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        store.set(spellDataStatusAtom, {
          ready: false,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to load spell data",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let unsubUserSettings: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, (u) => {
      // update user atom with new user (or no user)
      store.set(userAtom, u);

      if (unsubUserSettings) {
        unsubUserSettings();
        unsubUserSettings = null;
      }

      if (!u) {
        stopCharactersRealtimeSync();
        store.set(charactersAtom, []);
        store.set(uiScaleAtom, 1);
        return;
      }

      unsubUserSettings = subscribeToUserSettings(u.uid, (settings) => {
        const next = settings.uiScale;
        if (typeof next === "number" && Number.isFinite(next)) {
          store.set(uiScaleAtom, next);
        } else {
          store.set(uiScaleAtom, 1);
        }
      });

      try {
        startCharactersRealtimeSync();
      } catch {
        // Fall back to one-shot refresh if the realtime listener can't start.
        refreshCharacters();
      }
    });

    return () => {
      unsub();
      if (unsubUserSettings) unsubUserSettings();
      stopCharactersRealtimeSync();
    };
  }, []);

  return (
    <div>
      <Toaster />
      <Navbar />
      <SpellViewerDialog />

      {user && (
        <main className="mx-auto w-full max-w-6xl mt-4">
          {spellStatus.loading && !spellStatus.error && (
            <div className="py-6 text-sm text-muted-foreground">
              Loading spell data...
            </div>
          )}
          {spellStatus.error && (
            <div className="py-6 text-sm text-destructive">
              {spellStatus.error}
            </div>
          )}
          <Routes>
            <Route path="/characters/:id" element={<CharacterPage />} />
            <Route
              path="/characters/:characterId/edit"
              element={<CharacterEditPage />}
            />
            <Route
              path="/characters/:characterId/wizard/edit"
              element={<WizardSpellSlotsPage />}
            />
            <Route
              path="/characters/:characterId/wizard/spellbooks"
              element={<WizardSpellbooksPage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/characters" element={<CharactersPage />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

export default App;
