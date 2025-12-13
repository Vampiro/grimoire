export enum CharacterClass {
  /** Priest class. */
  PRIEST = "Priest",
  /** Wizard class. */
  WIZARD = "Wizard",
}

export interface ClassProgression {
  className: CharacterClass;
  level: number;
}

export interface PreparedSpell {
  spellId: string;
  used: boolean;
}

/** Additional slots applied on top of base spell tables. */
export interface SpellSlotModifier {
  /** Target spell level; use "all" to apply to every spell level. */
  spellLevel: number | "all";
  /** When true, add the base slots again (effectively doubling base for that level). */
  addBase: boolean;
  /** Flat bonus (can be negative) applied after base and optional extra base. */
  bonus: number;
  /** When true (default), only applies to spell levels the caster can actually cast. */
  requiresSpellLevelAccess?: boolean;
}

/** A wizard's spellbook containing learned spells. */
export interface WizardSpellbook {
  id: string;
  name: string;
  numberOfPages: number;
  /** Array of spell IDs in format "ClassName - Spell Name" */
  spells: string[];
}

/** For caster classes with a certain number of prepared spell slots per level. */
export interface PreparedCasterProgression extends ClassProgression {
  /** The prepared spells for each level. `<level, prepared spell list for that level>` */
  preparedSpells: Record<number, PreparedSpell[]>;
  /** Optional modifiers applied to base spell slot tables. */
  spellSlotModifiers?: SpellSlotModifier[];
}

export interface WizardClassProgression extends PreparedCasterProgression {
  /** The wizard class. */
  className: CharacterClass.WIZARD;
  /** Spellbooks that contain learned spells. */
  spellbooks: WizardSpellbook[];
}

export interface PriestClassProgression extends PreparedCasterProgression {
  /** The priest class. */
  className: CharacterClass.PRIEST;
}
