import { createCharacter, deleteCharacter } from "./firebase/characters";
import { useAtomValue } from "jotai";
import { charactersAtom } from "./globalState";

export default function CharacterList() {
  const characters = useAtomValue(charactersAtom);
  async function onCreate() {
    await createCharacter({
      name: `New Wizard - ${crypto.randomUUID()}`,
      class: "Wizard",
    });
  }

  /** Delete a character and refresh list */
  const handleDelete = async (characterId: string) => {
    await deleteCharacter(characterId);
  };

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
