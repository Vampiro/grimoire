/**
 * A Spell with general details and links to descriptions. Not linked to a player or spellbook.
 *
 * @remarks
 * Spell lists are stored/loaded per-class, so this type intentionally does not
 * include a `class` field.
 */
export interface Spell {
  /** Level of the spell. */
  level: number;
  /** AD&D 2e Wiki link to spell. */
  link: string;
  /** Name of the spell. */
  name: string;
}
