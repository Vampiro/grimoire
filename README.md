# AD&D 2e Grimoire

A spellcasting companion for Advanced Dungeons & Dragons 2nd Edition. It helps you browse spells, manage wizard spellbooks, track priest spheres, and handle preparation/casting for characters.

Site: [AD&D 2e Grimoire Website](https://vampiro.github.io/grimoire/)

## Disclaimer

This was built for my own personal use, though you're welcome to use it. If you do, keep a backup of your spellbooks on paper in case this project ever goes away. User data is stored in Google Firebase under a free tier (hopefully it stays that way).

## Features

- Create Character: set name, add wizard/priest classes, and choose priest spheres.
- Character View: quick overview of a character and their spellcasting status.
- Character Edit: adjust class levels and details.
- Spell Explorer: filter the full spell list by class, level range, and spheres.
- Spell View: full spell details, with favorites and personal notes when signed in.
- Wizard Spell Slots: Automatically (based on wizard level) keeps track of the number of spell slots you have for each level. Also allows you add persistent modifications to each (or all) levels.
- Wizard Spellbooks: create books, add/remove spells, and track page limits.
- Wizard Known Spells: manage the wizard’s learned spell list.
- Wizard Prepare Spells: fill prepared slots after resting.
- Wizard Cast Spells: track remaining prepared spells during the day.
- Priest Spell Slots: Automatically (based on priest level) keeps track of the number of spell slots you have for each level. Also allows you add persistent modifications to each (or all) levels.
- Priest Castable List: brings up the spell explorer with filters set for your priest's level and spell spheres.
- Priest Prepare Spells: select prepared spells based on spheres and level.
- Priest Cast Spells: track remaining prepared spells during the day.
- Favorites: save spells for quick access across pages.
- Notes: attach personal notes to spell pages.
- Settings: user preferences like UI scale.

## Technologies

- React
- TypeScript
- Vite
- Tailwind CSS
- Firebase (Auth + Firestore)
- Jotai
- shadcn/ui

## Spell Data Source

The spell descriptions, and only the spell descriptions, are sourced from the [AD&D 2e Wiki](https://adnd2e.fandom.com/wiki/Advanced_Dungeons_%26_Dragons_2nd_Edition_Wiki) and are licensed [CC BY-SA](https://www.fandom.com/licensing). Spell page data was pulled down and parsed from MediaWiki markup into JSON and HTML. Hopefully not too many mistakes were made in the parsing! Definitely thankful to the folks there who have contributed so much to that Wiki. I fixed what I found while making my mini-project under the alias [CheetahGoesMeow](https://adnd2e.fandom.com/wiki/User:CheetahGoesMeow).
