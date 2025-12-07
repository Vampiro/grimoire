import { useAtomValue } from "jotai";
import "./App.css";
import CharacterList from "./CharacterList";
import Login from "./Login";
import { store, userAtom } from "./globalState";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { refreshCharacters } from "./firebase/characters";
import { Spell } from "./types/Spell";
import { SpellSelect } from "./SpellSelect";
import { wizardSpells } from "./data/wizardSpells";
import { Route, Routes } from "react-router-dom";
import CharactersPage from "./pages/CharactersPage";
import CharacterPage from "./pages/CharacterPage";
import Navbar from "./components/custom/Navbar";

function App() {
  const user = useAtomValue(userAtom);
  const [selectedSpell, setSelectedSpell] = useState<Spell | undefined>();

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

      <Routes>
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/character" element={<CharacterPage />} />
      </Routes>

      {user && (
        <div>
          <div>
            <SpellSelect
              spells={wizardSpells}
              value={selectedSpell}
              onChange={setSelectedSpell}
            />
            {selectedSpell && (
              <p>
                Selected spell:{" "}
                <a
                  href={selectedSpell.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selectedSpell.name}
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
