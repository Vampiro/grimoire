import type { Spell } from "@/types/Spell";

export const UNKNOWN_SPELL_LEVEL = -1;
const UNKNOWN_SORT_LEVEL = 100;

export const QUEST_LEVEL_STRING = "Quest";
export const UNKNOWN_LEVEL_STRING = "Unknown";

type SpellLevelLike = Pick<Spell, "level" | "levelString">;

export const getSpellLevelSortValue = (level: number) =>
  level === UNKNOWN_SPELL_LEVEL ? UNKNOWN_SORT_LEVEL : level;

export const getSpellLevelDisplay = ({
  level,
  levelString,
}: SpellLevelLike) => (levelString ? levelString : String(level));

export const getSpellLevelCategoryLabel = ({
  level,
  levelString,
}: SpellLevelLike) => (levelString ? levelString : `Level ${level}`);

export const getSpellLevelGroup = (spell: SpellLevelLike) => {
  const display = getSpellLevelDisplay(spell);
  const label = getSpellLevelCategoryLabel(spell);
  return {
    key: display,
    label,
    sortValue: getSpellLevelSortValue(spell.level),
  };
};

export const isQuestSpell = (spell: SpellLevelLike) =>
  spell.level === UNKNOWN_SPELL_LEVEL &&
  (spell.levelString ?? "") === QUEST_LEVEL_STRING;

export const isUnknownLevelSpell = (spell: SpellLevelLike) =>
  spell.level === UNKNOWN_SPELL_LEVEL && !isQuestSpell(spell);
