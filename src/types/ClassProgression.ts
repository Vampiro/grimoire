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

/** For caster classes with a certain number of prepared spell slots per level. */
export interface PreparedCasterProgression extends ClassProgression {
  /** The prepared spells for each level. `<level, prepared spell list for that level>` */
  preparedSpells: Record<number, PreparedSpell[]>;
  /** Number of prepared spell slots per spell level. `<level, numer of prepared spell slots>` */
  spellSlots: Record<number, number>;
}

export interface WizardClassProgression extends PreparedCasterProgression {
  /** The wizard class. */
  className: CharacterClass.WIZARD;
}

export interface PriestClassProgression extends PreparedCasterProgression {
  /** The priest class. */
  className: CharacterClass.PRIEST;
}
