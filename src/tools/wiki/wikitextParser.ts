import type { SpellDescriptionJson } from "./types";
import wtf from "wtf_wikipedia";

/**
 * Parses wikitext from the AD&D 2e wiki into a structured spell description.
 *
 * @remarks
 * This is a pragmatic parser (not a full MediaWiki AST parser). It focuses on:
 * - `{{Infobox Spells ...}}` key/value fields
 * - `==Section==` headings
 * - `[[Category:...]]` tags
 */
export function parseSpellWikitextToJson(opts: {
  /** Optional page title (used for traceability/metadata). */
  title: string | null;
  /** Raw wikitext as returned by MediaWiki. */
  wikitext: string;
}): SpellDescriptionJson {
  const normalizedWikitext = preprocessWikitextForParsing(opts.wikitext);

  // Prefer a real wikitext parser; fall back to the legacy pragmatic parser.
  const parsedViaWtf = tryParseWithWtfWikipedia({
    title: opts.title,
    wikitext: normalizedWikitext,
  });
  if (parsedViaWtf) return parsedViaWtf;

  const { infobox, bodyAfterInfobox } = parseInfoboxSpells(normalizedWikitext);
  const sections = parseSections(bodyAfterInfobox);

  return {
    title: opts.title,
    infobox,
    sections,
  };
}

/**
 * Normalizes wikitext prior to parsing.
 *
 * @remarks
 * Replaces common wiki line-break templates/tags with real newlines so both
 * the wtf_wikipedia parser and the fallback parser behave more consistently.
 */
function preprocessWikitextForParsing(wikitext: string): string {
  // Normalize common line-break conventions. This improves both the structured
  // parser and the fallback line-based parser.
  return wikitext
    .replace(/\{\{\s*br\s*\}\}/gi, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n");
}

/**
 * Attempts to parse wikitext using `wtf_wikipedia` + HTML plugin.
 *
 * @returns Parsed JSON if successful; otherwise `null` to trigger the fallback parser.
 */
function tryParseWithWtfWikipedia(opts: {
  /** Optional page title (not required by the parser). */
  title: string | null;
  /** Normalized wikitext to parse. */
  wikitext: string;
}): SpellDescriptionJson | null {
  try {
    const doc = wtf(opts.wikitext);

    const infobox: Record<string, string> = {};
    const firstInfobox = doc.infoboxes()?.[0];
    if (firstInfobox) {
      const raw = firstInfobox.json?.() as unknown;
      if (raw && typeof raw === "object") {
        for (const [key, value] of Object.entries(
          raw as Record<string, unknown>,
        )) {
          const text = extractWtfValueText(value);
          if (key && text) infobox[key] = text;
        }
      }
    }

    const sections: Record<string, string> = {};
    for (const section of doc.sections?.() ?? []) {
      const heading = (section.title?.() ?? "").trim() || "Introduction";
      const content = (section.text?.() ?? "").trim();
      if (!content) continue;

      if (!sections[heading]) {
        sections[heading] = content;
      } else {
        sections[heading] = `${sections[heading]}\n\n${content}`;
      }
    }

    return {
      title: opts.title,
      infobox,
      sections,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts a readable string from values returned by `wtf_wikipedia` infobox JSON.
 */
function extractWtfValueText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const maybeText = (value as { text?: unknown }).text;
    if (typeof maybeText === "string") return maybeText.trim();
  }
  return String(value).trim();
}

/**
 * Extracts `{{Infobox Spells ...}}` key/value pairs using a simple line-based heuristic.
 */
function parseInfoboxSpells(wikitext: string): {
  /** Key/value fields parsed from the infobox. */
  infobox: Record<string, string>;
  /** Remaining wikitext after the infobox block (best-effort). */
  bodyAfterInfobox: string;
} {
  const lines = wikitext.split(/\r?\n/);
  const startIndex = lines.findIndex((l) =>
    l.trim().startsWith("{{Infobox Spells"),
  );
  if (startIndex === -1) {
    return { infobox: {}, bodyAfterInfobox: wikitext };
  }

  const infobox: Record<string, string> = {};
  let endIndex = startIndex;

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    endIndex = i;

    if (line.startsWith("}}")) {
      break;
    }

    if (!line.startsWith("|")) continue;

    const withoutPipe = line.slice(1);
    const eq = withoutPipe.indexOf("=");
    if (eq === -1) continue;

    const key = withoutPipe.slice(0, eq).trim();
    const value = withoutPipe.slice(eq + 1).trim();

    if (key && value) {
      infobox[key] = value;
    }
  }

  const bodyAfterInfobox = lines.slice(endIndex + 1).join("\n");
  return { infobox, bodyAfterInfobox };
}

/**
 * Parses `==Heading==` sections into a map.
 *
 * @remarks
 * This is only used by the fallback parser; the preferred path uses
 * `doc.sections()` from wtf_wikipedia.
 */
function parseSections(wikitext: string): Record<string, string> {
  const lines = wikitext.split(/\r?\n/);

  const sections: Record<string, string> = {};
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (!content) return;

    const key = currentHeading ?? "Introduction";
    if (!sections[key]) {
      sections[key] = content;
    } else {
      // If duplicate headings occur, append.
      sections[key] = `${sections[key]}\n\n${content}`;
    }
  };

  const headingRe = /^(={2,})\s*(.*?)\s*\1\s*$/;

  for (const line of lines) {
    if (line.trim().startsWith("[[Category:")) continue;

    const m = headingRe.exec(line.trim());
    if (m) {
      flush();
      currentHeading = m[2]?.trim() || "Section";
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flush();
  return sections;
}
