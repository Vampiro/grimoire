import { CharacterClass } from "./ClassProgression";

/**
 * A Spell with general details and links to descriptions. Not linked to a player or spellbook.
 *
 * Can be uniquely identified by spell name and class.
 */
export interface Spell {
  /** Class the spell is for. e.g. wizard, priest. */
  class: CharacterClass;
  /** Level of the spell. */
  level: number;
  /** AD&D 2e Wiki link to spell. */
  link: string;
  /** Name of the spell. */
  name: string;
}
