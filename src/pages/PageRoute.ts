/**
 * Centralized route helpers.
 *
 * Prefer using these helpers over hard-coded paths to keep links and routes in
 * sync.
 */
export const PageRoute = {
  HOME: "/",
  CHARACTERS: "/characters",
  CHARACTERS_NEW: "/characters/new",
  SETTINGS: "/settings",
  TEST: "/test",
  /** Character overview page. */
  CHARACTER_VIEW: (characterId: string) => `/characters/${characterId}`,
  /** Character edit page. */
  CHARACTER_EDIT: (characterId: string) => `/characters/${characterId}/edit`,
  /** Wizard "cast" page (tracks remaining casts during a rest). */
  WIZARD_CAST: (characterId: string) =>
    `/characters/${characterId}/wizard/cast`,
  /** Wizard "prepare" page (choose and adjust prepared spells after resting). */
  WIZARD_PREPARE: (characterId: string) =>
    `/characters/${characterId}/wizard/prepare`,
  /** Wizard spell slot management page. */
  WIZARD_SPELL_SLOTS: (characterId: string) =>
    `/characters/${characterId}/wizard/edit`,
  /** Priest "cast" page (tracks remaining casts during a rest). */
  PRIEST_CAST: (characterId: string) =>
    `/characters/${characterId}/priest/cast`,
  /** Priest "prepare" page (choose and adjust prepared spells after resting). */
  PRIEST_PREPARE: (characterId: string) =>
    `/characters/${characterId}/priest/prepare`,
  /** Priest spell slot management page. */
  PRIEST_SPELL_SLOTS: (characterId: string) =>
    `/characters/${characterId}/priest/edit`,
  /** Wizard spellbooks page. */
  WIZARD_SPELLBOOKS: (characterId: string) =>
    `/characters/${characterId}/wizard/spellbooks`,
  /** Wizard known spells page. */
  WIZARD_KNOWN_SPELLS: (characterId: string) =>
    `/characters/${characterId}/wizard/known_spells`,
  /** Spell viewer page. */
  SPELL_VIEW: (spellId: string | number) => `/spells/${spellId}`,
  /** Wizard spellbook creation page. */
  WIZARD_SPELLBOOKS_NEW: (characterId: string) =>
    `/characters/${characterId}/wizard/spellbooks/new`,
  /** Wizard spellbook edit page. */
  WIZARD_SPELLBOOKS_EDIT: (characterId: string, spellbookId: string) =>
    `/characters/${characterId}/wizard/spellbooks/${spellbookId}/edit`,
};
