/**
 * Latest known versions for runtime-loaded resources.
 *
 * @remarks
 * Increment a value to invalidate IndexedDB caches and force a refetch.
 */
export const LATEST_RESOURCE_VERSIONS = {
  priestSpellDescriptions: 21,
  priestSpells: 8,
  wizardSpellDescriptions: 18,
  wizardSpells: 9,
} as const;

export type LatestResourceVersions = typeof LATEST_RESOURCE_VERSIONS;
