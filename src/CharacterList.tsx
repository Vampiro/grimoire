import { useEffect, useState } from "react";
import {
  getCharacters,
  createCharacter,
  deleteCharacter,
} from "./firebase/characters";
import { Character } from "./types/Character";

export default function CharacterList() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    console.log("GET CHARACTERS");
    const chars = await getCharacters();
    setCharacters(chars);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    await createCharacter({
      name: `New Wizard - ${crypto.randomUUID()}`,
      class: "Wizard",
    });
    load();
  }

  /** Delete a character and refresh list */
  const handleDelete = async (characterId: string) => {
    await deleteCharacter(characterId);
    load();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <button onClick={onCreate}>Create Character</button>
      <ul>
        {characters.map((c) => (
          <li key={c.id}>
            <span>
              {c.name} — {c.class}
            </span>
            <button
              onClick={() => handleDelete(c.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
