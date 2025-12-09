import { createCharacter, deleteCharacter } from "./firebase/characters";
import { useAtomValue } from "jotai";
import { charactersAtom } from "./globalState";
import { CharacterClass } from "./types/ClassProgression";

export function CharacterList() {
  const characters = useAtomValue(charactersAtom);
  async function onCreate() {
    await createCharacter({
      name: `New Wizard - ${crypto.randomUUID()}`,
      classes: [
        {
          className: CharacterClass.WIZARD,
          level: 1,
          preparedSpells: [],
          spellSlots: [],
        },
      ],
      revision: 1,
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
              {c.name} —{" "}
              {c.classes.map((classProgression) => classProgression.className)}
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
