/**
 * Centralized route helpers.
 *
 * Prefer using these helpers over hard-coded paths to keep links and routes in
 * sync.
 */
export const PageRoute = {
  HOME: "/",
  CHARACTERS: "/characters",
  SETTINGS: "/settings",
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
  /** Wizard spellbooks page. */
  WIZARD_SPELLBOOKS: (characterId: string) =>
    `/characters/${characterId}/wizard/spellbooks`,
};
