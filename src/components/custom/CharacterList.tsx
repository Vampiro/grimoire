import { createCharacter, deleteCharacter } from "../../firebase/characters";
import { useAtomValue } from "jotai";
import { charactersAtom } from "../../globalState";
import { CharacterClass } from "../../types/ClassProgression";
import { Link } from "react-router-dom";

export function CharacterList() {
  const characters = useAtomValue(charactersAtom);
  async function onCreate() {
    await createCharacter({
      name: `New Wizard`,
      classes: [
        {
          className: CharacterClass.WIZARD,
          level: 1,
          preparedSpells: {},
          spellbooks: [],
          spellSlotModifiers: [],
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
              {`${c.name} - ${c.id}`} —{" "}
              {c.classes.map((classProgression) => classProgression.className)}
            </span>
            <button
              onClick={() => handleDelete(c.id)}
              className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
            >
              Delete
            </button>
            <Link
              to={`/characters/${c.id}`}
              className="text-blue-600 hover:underline"
            >
              Link to character
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
