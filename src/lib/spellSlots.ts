import { priestBaseSlots } from "@/data/priestSpellSlots";
import { wizardBaseSlots } from "@/data/wizardSpellSlots";
import {
  PriestClassProgression,
  SpellSlotModifier,
  WizardClassProgression,
} from "@/types/ClassProgression";

/**
 * Clamp a caster level to the valid spell table range.
 * @param level Requested class level (1-based).
 * @param max Highest supported level in the table.
 * @returns Level constrained to the valid range.
 */
function clampLevel(level: number, max: number) {
  if (level < 1) return 1;
  if (level > max) return max;
  return level;
}

/**
 * Convert an array of slot counts into a record keyed by spell level (1-indexed).
 * @param values Slot counts for spell levels starting at level 1.
 * @returns Mapping of spell level to slot count (omits zero entries).
 */
function toRecord(values: number[]): Record<number, number> {
  return values.reduce<Record<number, number>>((acc, val, idx) => {
    if (val > 0) acc[idx + 1] = val;
    return acc;
  }, {});
}

/**
 * Get the base wizard spell slots for the given class level.
 * @param level Wizard class level (1-20).
 * @returns Record keyed by spell level to slot count.
 */
export function getWizardBaseSlots(level: number): Record<number, number> {
  const row = wizardBaseSlots[clampLevel(level, wizardBaseSlots.length) - 1];
  return toRecord(row);
}

/**
 * Get the base priest spell slots for the given class level.
 * @param level Priest class level (1-20).
 * @returns Record keyed by spell level to slot count.
 */
export function getPriestBaseSlots(level: number): Record<number, number> {
  const row = priestBaseSlots[clampLevel(level, priestBaseSlots.length) - 1];
  return toRecord(row);
}

/**
 * Apply slot modifiers to a base spell slot table.
 * @param base Base spell slots keyed by spell level.
 * @param modifiers Custom slot modifiers to apply.
 * @param maxSpellLevel Highest spell level available for the class.
 * @returns Adjusted spell slot table.
 */
function applySpellSlotModifiers(
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

/**
 * Compute wizard spell slots with optional modifiers applied.
 * @param level Wizard class level.
 * @param modifiers Optional slot modifiers.
 * @returns Adjusted wizard spell slots keyed by spell level.
 */
export function getWizardSpellSlots(
  level: number,
  modifiers: SpellSlotModifier[] = [],
): Record<number, number> {
  const base = getWizardBaseSlots(level);
  return applySpellSlotModifiers(base, modifiers, 9);
}

/**
 * Compute priest spell slots with optional modifiers applied.
 * @param level Priest class level.
 * @param modifiers Optional slot modifiers.
 * @returns Adjusted priest spell slots keyed by spell level.
 */
export function getPriestSpellSlots(
  level: number,
  modifiers: SpellSlotModifier[] = [],
): Record<number, number> {
  const base = getPriestBaseSlots(level);
  return applySpellSlotModifiers(base, modifiers, 7);
}

/**
 * Resolve prepared spell slots for a wizard progression.
 * @param progression Wizard progression data including modifiers.
 * @returns Wizard spell slots keyed by spell level.
 */
export function getPreparedWizardSpellSlots(
  progression: WizardClassProgression,
): Record<number, number> {
  return getWizardSpellSlots(
    progression.level,
    progression.spellSlotModifiers ?? [],
  );
}

/**
 * Resolve prepared spell slots for a priest progression.
 * @param progression Priest progression data including modifiers.
 * @returns Priest spell slots keyed by spell level.
 */
export function getPreparedPriestSpellSlots(
  progression: PriestClassProgression,
): Record<number, number> {
  return getPriestSpellSlots(
    progression.level,
    progression.spellSlotModifiers ?? [],
  );
}
