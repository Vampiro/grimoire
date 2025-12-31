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
  }

  export interface WtfDocument {
    infoboxes(): WtfInfobox[];
    sections(): WtfSection[];
  }

  export default function wtf(
    wikitext: string,
    options?: WtfOptions,
  ): WtfDocument;
}
