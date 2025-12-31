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

## Admin

(Admin-only links)

- [Firebase](https://console.firebase.google.com/u/0/project/dnd2e-grimoire/overview)

## Ideas

- Player notes for spells (spell name + spell class) that can simplify instructions or give guidance on rolls.
  - type SpellNote = { spellName, spellClass, note }
- Character notes.
- Spellbook description.
- Ability to add any spells to a bonus area that are from items and such.
