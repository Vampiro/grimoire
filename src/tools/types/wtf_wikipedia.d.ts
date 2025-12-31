declare module "wtf_wikipedia" {
  export type WtfOptions = {
    /** Optional language code. */
    lang?: string;
  };

  export type WtfValueJson = {
    text?: string;
    number?: number;
    formatting?: unknown;
  };

  export interface WtfInfobox {
    /** Template name, normalized by the library (e.g. "spells"). */
    template(): string;
    /** JSON representation of infobox key/value pairs. */
    json(): Record<string, WtfValueJson | string | number | boolean | null>;
  }

  export interface WtfSection {
    /** Section title; empty for lead section. */
    title(): string;
    /** Plaintext content for this section. */
    text(): string;
    /** HTML output for this section (requires `wtf-plugin-html`). */
    html(): string;
  }

  export interface WtfDocument {
    infoboxes(): WtfInfobox[];
    sections(): WtfSection[];
    /** HTML output for the whole document (requires `wtf-plugin-html`). */
    html(): string;
  }

  export interface WtfStatic {
    (wikitext: string, options?: WtfOptions): WtfDocument;

    /** Extend parsing/rendering via plugins (e.g. `wtf-plugin-html`). */
    extend(plugin: unknown): void;
    /** Alternate plugin API exposed by the library. */
    plugin(plugin: unknown): void;

    /** Version string. */
    version: string;

    /** Network fetch helper (not used by our generators directly). */
    fetch: (...args: unknown[]) => Promise<WtfDocument>;
  }

  const wtf: WtfStatic;
  export default wtf;
}
