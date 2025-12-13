import {
  CharacterClass,
  PreparedCasterProgression,
  SpellSlotModifier,
} from "@/types/ClassProgression";

// Base wizard slots by level (1-20), spell levels 1-9
const wizardBaseSlots: number[][] = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [2, 1, 0, 0, 0, 0, 0, 0, 0], // 3
  [3, 2, 0, 0, 0, 0, 0, 0, 0], // 4
  [4, 2, 1, 0, 0, 0, 0, 0, 0], // 5
  [4, 2, 2, 0, 0, 0, 0, 0, 0], // 6
  [4, 3, 2, 1, 0, 0, 0, 0, 0], // 7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 8
  [4, 3, 3, 2, 1, 0, 0, 0, 0], // 9
  [4, 4, 3, 2, 2, 0, 0, 0, 0], // 10
  [4, 4, 4, 3, 3, 0, 0, 0, 0], // 11
  [4, 4, 4, 4, 4, 1, 0, 0, 0], // 12
  [5, 5, 5, 4, 4, 2, 0, 0, 0], // 13
  [5, 5, 5, 4, 4, 2, 1, 0, 0], // 14
  [5, 5, 5, 5, 5, 2, 1, 0, 0], // 15
  [5, 5, 5, 5, 5, 3, 2, 1, 0], // 16
  [5, 5, 5, 5, 5, 3, 3, 2, 0], // 17
  [5, 5, 5, 5, 5, 3, 3, 2, 1], // 18
  [5, 5, 5, 5, 5, 3, 3, 3, 1], // 19
  [5, 5, 5, 5, 5, 4, 3, 3, 2], // 20
];

// Base priest slots by level (1-20), spell levels 1-7
const priestBaseSlots: number[][] = [
  [1, 0, 0, 0, 0, 0, 0], // 1
  [2, 0, 0, 0, 0, 0, 0], // 2
  [2, 1, 0, 0, 0, 0, 0], // 3
  [3, 2, 0, 0, 0, 0, 0], // 4
  [3, 3, 1, 0, 0, 0, 0], // 5
  [3, 3, 2, 0, 0, 0, 0], // 6
  [3, 3, 2, 1, 0, 0, 0], // 7
  [3, 3, 3, 2, 0, 0, 0], // 8
  [4, 4, 3, 2, 1, 0, 0], // 9
  [4, 4, 3, 3, 2, 0, 0], // 10
  [5, 4, 4, 3, 2, 1, 0], // 11
  [6, 5, 5, 3, 2, 2, 0], // 12
  [6, 6, 6, 4, 2, 2, 0], // 13
  [6, 6, 6, 5, 3, 2, 1], // 14
  [6, 6, 6, 6, 4, 2, 1], // 15
  [7, 7, 7, 6, 4, 3, 1], // 16
  [7, 7, 7, 7, 5, 3, 2], // 17
  [8, 8, 8, 8, 6, 4, 2], // 18
  [9, 9, 8, 8, 6, 4, 2], // 19
  [9, 9, 9, 8, 7, 5, 2], // 20
];

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
