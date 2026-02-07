/**
 * Latest known versions for runtime-loaded resources.
 *
 * @remarks
 * Increment a value to invalidate IndexedDB caches and force a refetch.
 */
export const LATEST_RESOURCE_VERSIONS = {
  priestSpellDescriptions: 20,
  priestSpells: 7,
  wizardSpellDescriptions: 17,
  wizardSpells: 8,
} as const;

export type LatestResourceVersions = typeof LATEST_RESOURCE_VERSIONS;
