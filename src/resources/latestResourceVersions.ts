/**
 * Latest known versions for runtime-loaded resources.
 *
 * @remarks
 * Increment a value to invalidate IndexedDB caches and force a refetch.
 */
export const LATEST_RESOURCE_VERSIONS = {
  wizardSpells: 1,
  priestSpells: 1,
} as const;

/**
 * Strongly-typed view of {@link LATEST_RESOURCE_VERSIONS}.
 */
export type LatestResourceVersions = typeof LATEST_RESOURCE_VERSIONS;
