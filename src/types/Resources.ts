/**
 * Types describing the generated public/resources payloads.
 */

/**
 * Known infobox-derived metadata fields for spell descriptions.
 *
 * @remarks
 * Generators should only populate these fields for now. Additional fields can
 * be added as we encounter new canonical infobox attributes.
 */
export interface SpellDescriptionMetadata {
  name?: string;
  source?: string;
  class?: string;
  level?: string;
  school?: string;
  sphere?: string;
  verbal?: string;
  somatic?: string;
  material?: string;
  range?: string;
  duration?: string;
  aoe?: string;
  preparationTime?: string;
  castingTime?: string;
  save?: string;
  requirements?: string;
  subtlety?: string;
  knockdown?: string;
  sensory?: string;
  critical?: string;
  quest?: string;
}

/**
 * Parsed spell description data extracted from wiki wikitext.
 */
export interface SpellDescriptionJson {
  /** Key/value fields parsed from `{{Infobox Spells ...}}`. */
  metadata: SpellDescriptionMetadata;
  /** Section bodies keyed by heading (e.g. `Combat & Tactics`). */
  sections: Record<string, string>;
}

/**
 * Output file format for generated spell descriptions in public/resources.
 */
export type SpellDescriptionsFile = {
  /** ISO timestamp of when the generator produced this file. */
  generatedAt: string;
  /** Base wiki origin used for fetches. */
  source: "https://adnd2e.fandom.com";
  /** Category name for traceability. */
  categoryName: string;
  /** Descriptions keyed by spell name (from metadata.name when present). */
  spellsByName: Record<string, SpellDescriptionJson>;
  /** Parsing errors encountered by this generator (not page fetch errors). */
  errors: Array<{ title: string; message: string }>;
};
