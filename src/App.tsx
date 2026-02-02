import { useAtomValue } from "jotai";
import "./App.css";
import {
  spellDataStatusAtom,
  store,
  spellNotesAtom,
  uiScaleAtom,
  userAtom,
} from "./globalState";
import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import {
  refreshCharacters,
  startCharactersRealtimeSync,
  stopCharactersRealtimeSync,
} from "./firebase/characters";
import { Route, Routes, useLocation } from "react-router-dom";
import { CharactersPage } from "./pages/CharactersPage";
import { CreateCharacterPage } from "./pages/CreateCharacterPage";
import { CharacterPage } from "./pages/CharacterPage";
import { CharacterEditPage } from "./pages/CharacterEditPage";
import { CreateSpellbookPage } from "./pages/CreateSpellbookPage";
import { EditSpellbookPage } from "./pages/EditSpellbookPage";
import { SpellViewPage } from "./pages/SpellViewPage";
import { SpellExplorerPage } from "./pages/SpellExplorerPage";
import { WizardCastSpellsPage } from "./pages/WizardCastSpellsPage";
import { WizardPrepareSpellsPage } from "./pages/WizardPrepareSpellsPage";
import { WizardSpellSlotsPage } from "./pages/WizardSpellSlotsPage";
import { WizardSpellbooksPage } from "./pages/WizardSpellbooksPage";
import { WizardKnownSpellsPage } from "./pages/WizardKnownSpellsPage";
import { PriestCastSpellsPage } from "./pages/PriestCastSpellsPage";
import { PriestPrepareSpellsPage } from "./pages/PriestPrepareSpellsPage";
import { PriestSpellSlotsPage } from "./pages/PriestSpellSlotsPage";
import { Navbar } from "./components/custom/Navbar";
import { Toaster } from "sonner";
import { charactersAtom } from "./globalState";
import { loadSpellData } from "./lib/spellLookup";
import { SettingsPage } from "./pages/SettingsPage";
import { subscribeToUserSettings } from "./firebase/userSettings";
import { TestPage } from "./pages/TestPage";
import { PageRoute } from "./pages/PageRoute";

/** Root application component. */
function App() {
  const user = useAtomValue(userAtom);
  const spellStatus = useAtomValue(spellDataStatusAtom);
  const uiScale = useAtomValue(uiScaleAtom);
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const clamped = Math.min(1.5, Math.max(0.75, uiScale));
    document.documentElement.style.fontSize = `${clamped * 100}%`;
  }, [uiScale]);

  useEffect(() => {
    if (
      document.referrer &&
      !document.referrer.startsWith(window.location.origin)
    ) {
      sessionStorage.removeItem("lastInternalPath");
    }
  }, []);

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`;
    const previousPath = lastPathRef.current;
    if (previousPath && previousPath !== currentPath) {
      sessionStorage.setItem("lastInternalPath", previousPath);
    }
    lastPathRef.current = currentPath;
  }, [location.pathname, location.search]);

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
        store.set(spellNotesAtom, {});
        return;
      }

      unsubUserSettings = subscribeToUserSettings(u.uid, (settings) => {
        const next = settings.uiScale;
        if (typeof next === "number" && Number.isFinite(next)) {
          store.set(uiScaleAtom, next);
        } else {
          store.set(uiScaleAtom, 1);
        }
        store.set(spellNotesAtom, settings.spellNotes ?? {});
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
          <Route path={PageRoute.TEST} element={<TestPage />} />
          <Route path={PageRoute.SPELLS} element={<SpellExplorerPage />} />
          <Route
            path={PageRoute.SPELL_VIEW(":spellId")}
            element={<SpellViewPage />}
          />
          {user && (
            <>
              <Route
                path={PageRoute.CHARACTERS_NEW}
                element={<CreateCharacterPage />}
              />
              <Route
                path={PageRoute.WIZARD_SPELLBOOKS_NEW(":characterId")}
                element={<CreateSpellbookPage />}
              />
              <Route
                path={PageRoute.WIZARD_SPELLBOOKS_EDIT(
                  ":characterId",
                  ":spellbookId",
                )}
                element={<EditSpellbookPage />}
              />
              <Route
                path={PageRoute.WIZARD_KNOWN_SPELLS(":characterId")}
                element={<WizardKnownSpellsPage />}
              />
              <Route path="/characters/:id" element={<CharacterPage />} />
              <Route
                path="/characters/:characterId/edit"
                element={<CharacterEditPage />}
              />
              <Route
                path="/characters/:characterId/wizard/cast"
                element={<WizardCastSpellsPage />}
              />
              <Route
                path="/characters/:characterId/wizard/prepare"
                element={<WizardPrepareSpellsPage />}
              />
              <Route
                path="/characters/:characterId/wizard/edit"
                element={<WizardSpellSlotsPage />}
              />
              <Route
                path="/characters/:characterId/priest/cast"
                element={<PriestCastSpellsPage />}
              />
              <Route
                path="/characters/:characterId/priest/prepare"
                element={<PriestPrepareSpellsPage />}
              />
              <Route
                path="/characters/:characterId/priest/edit"
                element={<PriestSpellSlotsPage />}
              />
              <Route
                path="/characters/:characterId/wizard/spellbooks"
                element={<WizardSpellbooksPage />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/characters" element={<CharactersPage />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

export default App;
