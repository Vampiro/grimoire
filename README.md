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

## Running the App

### Backend

When the user logs in, they can store things like spells, spellbooks, etc. for a character. These are stored in Firebase.

- Authentication needs to be set up in Firebase.
- Firestore database rules need to be set up.
- Environment variables needed for this app (all of which are to connect the frontend to Firebase):

```sh
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

### Data Scripts

These scripts generate the spell data:

- `npm run generate:wiki:category:wizard-spells`: fetch wizard spell category members. This saves Wiki data locally (and is checked in under `/data`).
- `npm run generate:wiki:category:priest-spells`: fetch priest spell category members. This saves Wiki data locally (and is checked in under `/data`).
- `npm run generate:wiki:spell-pages:all`: fetch spell page wikitext for wizard + priest. This saves Wiki data locally (and is checked in under `/data`).
- `npm run generate:wiki:spell-descriptions`: generate spell description JSON from wikitext. This saves the data the app will actually use (and is checked in under `/public`).
- `npm run generate:wiki:all`: run all wiki generation steps in order.

## Spell Descriptions

The spell descriptions were sourced from the [AD&D 2e Wiki](https://adnd2e.fandom.com/wiki/Advanced_Dungeons_%26_Dragons_2nd_Edition_Wiki). The descriptions are licensed [CC BY-SA](https://www.fandom.com/licensing). Spells were pulled down and parsed from MediaWiki markup into JSON and HTML. Hopefully not too many mistakes were made in the parsing/transforms! I'm thankful to the folks who have contributed so much to that Wiki. As I went, I tried to fix whatever small issues with spells I found under the alias [CheetahGoesMeow](https://adnd2e.fandom.com/wiki/User:CheetahGoesMeow).
