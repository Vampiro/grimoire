# AD&D 2e Grimoire

Helps with the organization of spells and spellbooks in AD&D 2e.

## Wiki Data Pipeline (Build-Time)

This repo includes Node-based generator scripts that cache spell data from the AD&D 2e Fandom MediaWiki API so we can work offline and avoid repeatedly hitting the wiki.

### Overview

1. Fetch the category member lists (wizard + priest spells) via `list=categorymembers`.
2. Fetch the wikitext for each spell page in batches via `prop=revisions&pageids=...`.
3. Write the resulting JSON caches under data/wiki (these files are not intended to be served by the app).

### Rate Limits / Batch Size

- Requests are rate-limited to no more than 3 requests/second.
- Wikitext fetch requests use up to 50 pageids per request.

### API Examples

- Category members (wizard spells):
  - https://adnd2e.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category:Wizard_Spells&cmlimit=500&cmnamespace=0&format=json
- Category members (priest spells):
  - https://adnd2e.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category:Priest_Spells&cmlimit=500&cmnamespace=0&format=json

- Revisions by page ids (wikitext batch):
  - https://adnd2e.fandom.com/api.php?action=query&prop=revisions&rvslots=main&rvprop=content&format=json&pageids=1474|41887|41888

### Scripts

- Generate category caches:
  - npm run generate:wiki:category:wizard-spells
  - npm run generate:wiki:category:priest-spells

- Fetch all spell pages (wizard + priest) in 50-pageid batches:
  - npm run generate:wiki:spell-pages:all

### Output Files

- Category member lists:
  - data/wiki/categoryWizardSpells.json
  - data/wiki/categoryPriestSpells.json

- Wikitext caches (fetched by pageid batches):
  - data/wiki/wizardSpells.json
  - data/wiki/priestSpells.json

### Notes

- Generator output strips Unicode format characters (category \p{Cf}) from titles and wikitext (e.g. soft hyphen U+00AD, BOM U+FEFF) to avoid VS Code “invisible unicode characters” warnings and reduce subtle string-matching issues.

### Spell Description Schema and Normalization

- Outputs live at `public/resources/{wizard,priest}SpellDescriptions.json` with shape:

```ts
type SpellDescription = {
  metadata: Record<string, string | boolean>; // plain text (booleans for components), infobox-derived (post overrides)
  sections: Record<string, string>; // HTML, keyed by heading (Introduction fallback)
  wikiPageId?: number; // MediaWiki page id for traceability
};
type SpellDescriptionsFile = {
  generatedAt: string;
  source: "https://adnd2e.fandom.com";
  categoryName: string;
  spellsByWikiPageId: Record<string, SpellDescription>; // keyed by MediaWiki pageid
  errors: Array<{ title: string; message: string }>;
};
```

- Infobox fields we expect (all optional; others are preserved as-is):
  - `name`, `source`, `class`, `level`, `school`, `sphere`
  - `verbal`, `somatic`, `material` (booleans; `true` when present, omitted when "0"/falsey)
  - `range`, `duration`, `aoe`, `preparationTime`, `castingTime`, `save`, `requirements`
  - PO: Spells & Magic extras: `subtlety`, `knockdown`, `sensory`, `critical`
  - Ignored metadata fields (dropped going forward): `category`, `damage`, `materials`, `type`, `difficulty`, `finalDifficulty`, `adjustedDifficulty` (wtf_wikipedia lowercases incoming keys; we normalize but do not persist these)

- Metadata normalization (applied after overrides):
  - Trim values; replace NBSP with space; collapse newlines to a single space (`source` uses `, `); collapse repeated commas/whitespace; drop trailing commas.
  - Case-insensitive merge for overrides; override keys replace existing, keeping only one casing.

- Sections (HTML) normalization:
  - Headings from wiki sections; default heading `Introduction` when none.
  - Strip `[[Category:...]]` lines; remove simple `{{...}}` template artifacts (e.g., `{{Highlight: ...}}`).
  - Normalize HTML via `wtf_wikipedia` with HTML plugin; fallback parser uses escaped text + `<br>`; duplicate headings append with `<br><br>`.

- Keys use the MediaWiki `pageid`; if multiple pages share a `pageid`, only the first is kept and later duplicates are reported in `errors`.

- Overrides file: `data/wiki/spellDescriptionOverrides.json`
  - `excludeTitles`: exact page titles to drop.
  - `spellsByTitle`: per-page overrides for `metadata` (text) and `sections` (HTML string or plain text with newlines → `<br>`).
  - Applied after parsing and before disambiguating duplicate spell names.

## Admin

(Admin-only links)

- [Firebase](https://console.firebase.google.com/u/0/project/dnd2e-grimoire/overview)

## Ideas

- Player notes for spells (spell name + spell class) that can simplify instructions or give guidance on rolls.
  - type SpellNote = { spellName, spellClass, note }
- Character notes.
- Spellbook description.
- Ability to add any spells to a bonus area that are from items and such.
