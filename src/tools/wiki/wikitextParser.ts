import type { SpellDescriptionJson } from "./types";

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
  pageName: string;
  pageId: number | null;
  title: string | null;
  wikitext: string;
}): SpellDescriptionJson {
  const { infobox, bodyAfterInfobox } = parseInfoboxSpells(opts.wikitext);
  const categories = parseCategories(opts.wikitext);
  const sections = parseSections(bodyAfterInfobox);

  return {
    pageName: opts.pageName,
    pageId: opts.pageId,
    title: opts.title,
    wikitext: opts.wikitext,
    infobox,
    categories,
    sections,
  };
}

function parseInfoboxSpells(wikitext: string): {
  infobox: Record<string, string>;
  bodyAfterInfobox: string;
} {
  const lines = wikitext.split(/\r?\n/);
  const startIndex = lines.findIndex((l) => l.trim().startsWith("{{Infobox Spells"));
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

function parseCategories(wikitext: string): string[] {
  const categories = new Set<string>();
  const re = /\[\[Category:([^\]]+)\]\]/g;
  let match: RegExpExecArray | null = null;
  while ((match = re.exec(wikitext))) {
    const label = match[1]?.trim();
    if (label) categories.add(label);
  }
  return Array.from(categories);
}

function stripCategoryLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("[[Category:"))
    .join("\n")
    .trim();
}

function parseSections(wikitext: string): Record<string, string> {
  const text = stripCategoryLines(wikitext);
  const lines = text.split(/\r?\n/);

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
