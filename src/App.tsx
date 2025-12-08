import { useAtomValue } from "jotai";
import "./App.css";
import { store, userAtom } from "./globalState";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { refreshCharacters } from "./firebase/characters";
import { Route, Routes } from "react-router-dom";
import { CharactersPage } from "./pages/CharactersPage";
import { CharacterPage } from "./pages/CharacterPage";
import { Navbar } from "./components/custom/Navbar";
import { wizardSpells } from "./data/wizardSpells";
import { SpellViewer } from "./components/custom/SpellViewer";

function App() {
  const user = useAtomValue(userAtom);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      // update user atom with new user (or no user)
      store.set(userAtom, u);
      // refresh characters
      refreshCharacters();
    });
  }, []);

  return (
    <div>
      <Navbar />

      {user && (
        <Routes>
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/character" element={<CharacterPage />} />
        </Routes>
      )}

      <SpellViewer
        spell={
          wizardSpells.find((s) => s.name === "Fireball") ?? wizardSpells[0]
        }
      />
    </div>
  );
}

export default App;
