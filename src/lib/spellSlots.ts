import { priestBaseSlots } from "@/data/priestSpellSlots";
import { wizardBaseSlots } from "@/data/wizardSpellSlots";
import {
  CharacterClass,
  PreparedCasterProgression,
  SpellSlotModifier,
} from "@/types/ClassProgression";

function clampLevel(level: number, max: number) {
  if (level < 1) return 1;
  if (level > max) return max;
  return level;
}

function toRecord(values: number[]): Record<number, number> {
  return values.reduce<Record<number, number>>((acc, val, idx) => {
    if (val > 0) acc[idx + 1] = val;
    return acc;
  }, {});
}

export function getWizardBaseSlots(level: number): Record<number, number> {
  const row = wizardBaseSlots[clampLevel(level, wizardBaseSlots.length) - 1];
  return toRecord(row);
}

export function getPriestBaseSlots(level: number): Record<number, number> {
  const row = priestBaseSlots[clampLevel(level, priestBaseSlots.length) - 1];
  return toRecord(row);
}

export function applySpellSlotModifiers(
  base: Record<number, number>,
  modifiers: SpellSlotModifier[] = [],
  maxSpellLevel: number,
): Record<number, number> {
  const result: Record<number, number> = {};

  for (let lvl = 1; lvl <= maxSpellLevel; lvl++) {
    const baseSlots = base[lvl] ?? 0;
    result[lvl] = baseSlots;
  }

  modifiers.forEach((mod) => {
    const targets =
      mod.spellLevel === "all"
        ? Array.from({ length: maxSpellLevel }, (_, i) => i + 1)
        : [mod.spellLevel];

    targets.forEach((lvl) => {
      const baseSlots = base[lvl] ?? 0;
      const shouldApply =
        mod.requiresSpellLevelAccess !== false ? baseSlots > 0 : true;
      if (!shouldApply) return;
      const extraBase = mod.addBase ? baseSlots : 0;
      result[lvl] = Math.max(
        0,
        (result[lvl] ?? baseSlots) + extraBase + mod.bonus,
      );
    });
  });

  return result;
}

export function getPreparedSpellSlots(
  progression: PreparedCasterProgression,
): Record<number, number> {
  const isWizard = progression.className === CharacterClass.WIZARD;
  const maxSpellLevel = isWizard ? 9 : 7;
  const base = isWizard
    ? getWizardBaseSlots(progression.level)
    : getPriestBaseSlots(progression.level);

  return applySpellSlotModifiers(
    base,
    progression.spellSlotModifiers ?? [],
    maxSpellLevel,
  );
}

export function getSlotsForCaster(
  className: CharacterClass,
  level: number,
  modifiers: SpellSlotModifier[] = [],
): Record<number, number> {
  const isWizard = className === CharacterClass.WIZARD;
  const maxSpellLevel = isWizard ? 9 : 7;
  const base = isWizard ? getWizardBaseSlots(level) : getPriestBaseSlots(level);
  return applySpellSlotModifiers(base, modifiers, maxSpellLevel);
}
