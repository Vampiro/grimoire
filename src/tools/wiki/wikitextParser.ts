import wtf from "wtf_wikipedia";
import wtfHtml from "wtf-plugin-html";
import type { SpellDescriptionJson } from "./types";

let htmlPluginApplied = false;
function ensureWtfHtmlPlugin(): void {
  if (!htmlPluginApplied) {
    // Enable the HTML plugin once so section.html() works.
    wtf.extend(wtfHtml);
    htmlPluginApplied = true;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToSimpleHtml(value: string): string {
  const escaped = escapeHtml(value);
  return normalizeHtml(escaped.replace(/\n/g, "<br>"));
}

function normalizeHtml(html: string): string {
  return html.replace(/\r?\n\s*/g, "").trim();
}

function sanitizeSectionHtml(html: string): string {
  // Drop template artifacts like {{Highlight: ...}} that leak through (even when unclosed).
  const withoutTemplates = html
    .replace(/\{\{\s*Highlight:\s*/gi, "")
    .replace(/\{\{\s*/g, "")
    .replace(/\}\}/g, "");
  return normalizeHtml(withoutTemplates);
}

/**
 * Parses wikitext from the AD&D 2e wiki into a structured spell description.
 *
 * @remarks
 * This is a pragmatic parser (not a full MediaWiki AST parser). It focuses on:
 * - `{{Infobox Spells ...}}` key/value fields (metadata)
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
  ensureWtfHtmlPlugin();

  // Prefer a real wikitext parser; fall back to the legacy pragmatic parser.
  const parsedViaWtf = tryParseWithWtfWikipedia({
    title: opts.title,
    wikitext: normalizedWikitext,
  });
  if (parsedViaWtf) return parsedViaWtf;

  const { infoboxText, bodyAfterInfobox } =
    parseInfoboxSpells(normalizedWikitext);
  const { sectionsHtml } = parseSections(bodyAfterInfobox);

  return {
    metadata: infoboxText,
    sections: sectionsHtml,
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
    .replace(/<br\s*\/?>/gi, "\n");
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

    const infoboxText: Record<string, string> = {};
    const firstInfobox = doc.infoboxes()?.[0];
    if (firstInfobox) {
      const raw = firstInfobox.json?.() as unknown;
      if (raw && typeof raw === "object") {
        for (const [key, value] of Object.entries(
          raw as Record<string, unknown>,
        )) {
          const text = normalizeInfoboxValue(key, extractWtfValueText(value));
          if (key && text) {
            infoboxText[key] = text;
          }
        }
      }
    }

    const sectionsHtml: Record<string, string> = {};
    for (const section of doc.sections?.() ?? []) {
      const heading = (section.title?.() ?? "").trim() || "Introduction";
      const content = normalizeSectionText(section.text?.() ?? "");
      if (!content) continue;

      const html = sanitizeSectionHtml(
        section.html?.() ?? textToSimpleHtml(content),
      );
      if (!sectionsHtml[heading]) {
        sectionsHtml[heading] = html;
      } else {
        sectionsHtml[heading] = `${sectionsHtml[heading]}<br><br>${html}`;
      }
    }

    return {
      metadata: infoboxText,
      sections: sectionsHtml,
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
 * Normalizes infobox values for UI rendering.
 *
 * @remarks
 * Requirements:
 * - Replace NBSP with normal spaces.
 * - Replace newlines inside infobox values with spaces.
 * - For the `source` field specifically, replace newlines with `, `.
 */
function normalizeInfoboxValue(key: string, value: string): string {
  const normalizedKey = key.trim().toLowerCase();

  const newlineReplacement = normalizedKey === "source" ? ", " : " ";

  return value
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, newlineReplacement)
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .trim()
    .replace(/,$/, "");
}

/**
 * Normalizes section text for UI rendering.
 *
 * @remarks
 * Requirements:
 * - Replace NBSP with normal spaces.
 * - Preserve newlines in section content.
 */
function normalizeSectionText(value: string): string {
  return (
    value
      .replace(/\u00A0/g, " ")
      .replace(/\r\n?/g, "\n")
      // Some wiki content contains hard line-wrapping that can split words.
      // Preserve paragraph breaks, but remove newlines that occur *within* words.
      .replace(/-\n(?=[A-Za-z])/g, "-")
      .replace(/([A-Za-z])\n(?=[A-Za-z])/g, "$1")
      .trim()
  );
}

/**
 * Extracts `{{Infobox Spells ...}}` key/value pairs using a simple line-based heuristic.
 */
function parseInfoboxSpells(wikitext: string): {
  /** Plain-text values parsed from the infobox. */
  infoboxText: Record<string, string>;
  /** Remaining wikitext after the infobox block (best-effort). */
  bodyAfterInfobox: string;
} {
  const lines = wikitext.split(/\r?\n/);
  const startIndex = lines.findIndex((l) =>
    l.trim().startsWith("{{Infobox Spells"),
  );
  if (startIndex === -1) {
    return { infoboxText: {}, bodyAfterInfobox: wikitext };
  }

  const infoboxText: Record<string, string> = {};
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
      const normalized = normalizeInfoboxValue(key, value);
      infoboxText[key] = normalized;
    }
  }

  const bodyAfterInfobox = lines.slice(endIndex + 1).join("\n");
  return { infoboxText, bodyAfterInfobox };
}

/**
 * Parses `==Heading==` sections into a map.
 *
 * @remarks
 * This is only used by the fallback parser; the preferred path uses
 * `doc.sections()` from wtf_wikipedia.
 */
function parseSections(wikitext: string): {
  sectionsHtml: Record<string, string>;
} {
  const lines = wikitext.split(/\r?\n/);

  const sectionsHtml: Record<string, string> = {};
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    const content = normalizeSectionText(currentLines.join("\n"));
    if (!content) return;

    const key = currentHeading ?? "Introduction";
    if (!sectionsHtml[key]) {
      sectionsHtml[key] = sanitizeSectionHtml(textToSimpleHtml(content));
    } else {
      sectionsHtml[key] =
        `${sectionsHtml[key]}<br><br>${sanitizeSectionHtml(textToSimpleHtml(content))}`;
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

    currentLines.push(line.replace(/\u00A0/g, " "));
  }

  flush();
  return { sectionsHtml };
}
