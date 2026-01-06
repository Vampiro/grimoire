export const PageRoute = {
  HOME: "/",
  CHARACTERS: "/characters",
  SETTINGS: "/settings",
  CHARACTER_VIEW: (characterId: string) => `/characters/${characterId}`,
  CHARACTER_EDIT: (characterId: string) => `/characters/${characterId}/edit`,
  WIZARD_SPELL_SLOTS: (characterId: string) =>
    `/characters/${characterId}/wizard/edit`,
  WIZARD_SPELLBOOKS: (characterId: string) =>
    `/characters/${characterId}/wizard/spellbooks`,
};
