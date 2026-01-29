import { CharacterClass, PreparedCasterProgression } from "./ClassProgression";

/** A wizard's spellbook containing learned spells. */
export interface WizardSpellbook {
  id: string;
  name: string;
  numberOfPages: number;
  /** When true, this spellbook is disabled. Defaults to false. */
  disabled?: boolean;
  /**
   * Set-like map of learned spell ids (MediaWiki page ids).
   * Stored as a set-like map to reduce cross-device conflicts.
   */
  spellsById: Record<string, true>;
}

export interface WizardClassProgression extends PreparedCasterProgression {
  /** The wizard class. */
  className: CharacterClass.WIZARD;
  /** Spellbook for wizard spells. */
  spellbooksById: Record<string, WizardSpellbook>;
}
