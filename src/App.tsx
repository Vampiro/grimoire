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
      {/* <div className="bg-white dark:bg-gray-900 text-black dark:text-white p-4"> */}
      <div className="bg-background text-foreground">Hello Dark Mode</div>

      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <Login />

      {user && (
        <div>
          <div>
            Characters:
            <CharacterList />
          </div>
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
            <p>Hello there</p>
            <p>Hello there</p>
            <p>Hello there</p>
            <p>Hello there</p>
            <p>Hello there</p>
            <p>Hello there</p>
            <p>Hello there</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
