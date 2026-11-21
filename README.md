# Scripture Search

A free, mobile-first Progressive Web App for reading and searching the major scriptures of the
world by keyword, emotion, or theme. Every verse shows its exact reference, original-language text
(where the open source provides it), a transliteration, and the English translation with its
translator.

- **Static and free to host** — no backend, no accounts, no paid APIs. Deploys to GitHub Pages or
  Cloudflare Pages.
- **Offline after first load** — installable PWA; collections you read are cached on the device.
- **Progressive search** — each collection ships a prebuilt, gzipped MiniSearch index. Results
  stream in as collections load, smallest first, so the phone never parses the whole corpus at once.
- **Equal, neutral presentation** — the same card and badge for every tradition, no ranking of
  religions, and a permanent reminder that translations are interpretations.

Bundled in this build: **149,748 verses** from 13 collections across Islam, Christianity,
Hinduism, Buddhism, Sikhism, Judaism, Taoism and Confucianism. The registry lists every requested text, including
those that could not be bundled and exactly why (see [SOURCES.md](SOURCES.md)).

## Features

- Instant search across translation, transliteration and theme tags, with matched words highlighted.
- Editable synonym/theme map (`data/synonyms.json`, 70 groups: happy, sad, angry, fear, patience,
  money, death, forgiveness, justice, truth, love, and more).
- Filters by religion and book; toggles for original, transliteration and translation; results
  grouped by religion or sorted by relevance.
- Copy, native Share, and Bookmark buttons on every verse; bookmarks stored locally.
- Browse: religion → book → chapter → verse reader with previous/next and adjustable text size.
- Verse of the day, recent searches, suggested theme chips.
- Dark mode (light/dark/system), per-device text size, local Noto fonts for Arabic, Devanagari,
  Hebrew and Gurmukhi.
- About page with every translation, translator, license and source link.

## Stack

React 18 · Vite 5 · TypeScript · Tailwind CSS 3 · MiniSearch 7 · vite-plugin-pwa (Workbox) ·
Noto fonts (local) · Node.js data pipeline.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

The generated data is committed under `public/data/`, so the app runs without rebuilding the
corpus. To rebuild everything from the original sources:

```bash
npm run data:all
```

Downloads are cached in `pipeline/.cache/`, so an interrupted run resumes instead of re-downloading.

## Project structure

```
data/synonyms.json          Editable theme/emotion map (also served to the app)
pipeline/                   Node.js data pipeline (one script per collection)
  lib.mjs                   fetch+cache, cleaning, transliteration, tagging, sharding
  fetch-quran.mjs           Qur'an
  fetch-hadith.mjs          Sahih al-Bukhari, Sahih Muslim (+4 more via CLI)
  fetch-bible.mjs           KJV + Hebrew Masoretic OT + SBL Greek NT
  fetch-tanakh.mjs          Tanakh (Hebrew + JPS 1917) from Sefaria
  fetch-gita.mjs            Bhagavad Gita
  fetch-dhammapada.mjs      Dhammapada
  fetch-guru-granth.mjs     Sri Guru Granth Sahib
  fetch-tao.mjs             Tao Te Ching
  fetch-analects.mjs        The Analects
  build-indexes.mjs         Gzipped MiniSearch index per collection
  build-registry.mjs        Registry, synonym copy, verse of the day
  build-all.mjs             Everything, in order
public/data/                Generated, lazily-loaded JSON + indexes
public/icons/               PWA icons
scripts/make-icons.py       Regenerate the icons
src/                        React app
  lib/                      registry loading, progressive search, storage, settings
  components/               SearchBar, Filters, VerseCard, SearchResults
  pages/                    Home, Search, Browse, Book, Reader, Bookmarks, Settings, About
```

## Data schema

Each collection is split into shards (`public/data/books/<id>-<n>.json`) so a phone downloads only
what it reads:

```json
{
  "book": {
    "id": "quran",
    "religion": "Islam",
    "title": "Qur'an",
    "language": "ar",
    "script": "arabic",
    "translationName": "The Meaning of the Glorious Koran",
    "translator": "Marmaduke Pickthall (1930)",
    "license": "Public domain translation; Arabic text Tanzil/Quran.com open data",
    "sourceUrl": "https://alquran.cloud/api"
  },
  "chapters": [
    {
      "number": 2,
      "title": "Al-Baqara · البقرة",
      "verses": [
        {
          "id": "quran-2-255",
          "religion": "Islam",
          "book": "Qur'an",
          "chapter": 2,
          "verse": 255,
          "ref": "Qur'an 2:255",
          "original": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ...",
          "translit": "Allahu la ilaha illa huwa ...",
          "translation": "Allah! There is no deity save Him ...",
          "translationName": "The Meaning of the Glorious Koran",
          "translator": "Marmaduke Pickthall (1930)",
          "tags": ["faith", "protection"]
        }
      ]
    }
  ]
}
```

`public/data/registry.json` describes every religion, every bundled collection, its shard files and
chapter index, plus catalogue entries for texts that are not bundled with an honest `reason`.

## Pipeline commands

| Collection | Command | Source | License |
| --- | --- | --- | --- |
| Qur'an | `npm run data:quran` | alquran.cloud (Tanzil / Quran.com data) | Arabic CC BY 3.0; Pickthall 1930 public domain |
| Hadith | `npm run data:hadith` | fawazahmed0/hadith-api | open dataset; see SOURCES.md |
| Bible | `npm run data:bible` | KJV JSON; openscriptures/morphhb; Faithlife/SBLGNT | KJV PD; Hebrew CC BY 4.0; Greek CC BY-SA 4.0 |
| Tanakh | `npm run data:tanakh` | Sefaria (Miqra according to the Masorah + JPS 1917) | Hebrew CC BY-SA; JPS 1917 public domain |
| Bhagavad Gita | `npm run data:gita` | AdiyogiArts/gita-json | MIT dataset; Sanskrit public domain |
| Dhammapada | `npm run data:dhammapada` | Wikisource (Max Müller 1881) | Public domain |
| Guru Granth Sahib | `npm run data:guru-granth-sahib` | BaniDB API | BaniDB open data |
| Tao Te Ching | `npm run data:tao-te-ching` | Wikisource (Legge 1891) + Chinese Wikisource | Public domain |
| Analects | `npm run data:analects` | Wikisource (Legge 1893) | Public domain |
| Rig Veda | `npm run data:rigveda` | Wikisource (Griffith 1896) | Public domain |
| Upanishads | `npm run data:upanishads` | Wikisource (Müller, SBE vols. I and XV) | Public domain |
| Yoga Sutras | `npm run data:yogasutras` | Project Gutenberg #2526 (Johnston 1912) | Public domain |
| Indexes | `npm run data:indexes` | generated | — |
| Registry | `npm run data:registry` | generated | — |
| Everything | `npm run data:all` | all of the above | — |

Hadith collections can be selected explicitly, for example:

```bash
node pipeline/fetch-hadith.mjs bukhari muslim abudawud tirmidhi nasai ibnmajah
```

Guru Granth Sahib can be built in ranges (useful on a weak connection), then written in full after
the cache is warm:

```bash
node pipeline/fetch-guru-granth.mjs 1 300
# … repeat for other ranges, then:
npm run data:guru-granth-sahib
```

To regenerate the PWA icons: `python3 scripts/make-icons.py` (requires Pillow).

## Regenerating and committing the data

Everything under `public/data` is committed — about 155 MB — and Git keeps a full copy of it in
every commit that changes it. So regenerate deliberately:

- Text changes need a data run: adding or removing a collection, fixing a parser, or correcting a
  verse. Use that collection's `data:` command, or `npm run data:all`.
- Editing `data/synonyms.json` re-tags every verse, so it needs `npm run data:all`.
- UI, styling, search and documentation work needs no data run at all.
- Any text change also needs `npm run data:indexes` (and `npm run data:registry` if collections
  or notes changed). `npm run data:all` does both at the end; a single `data:` command does not.
- Check the cost before committing: `du -sh public/data` and `git diff --stat`. A routine full
  refresh adds roughly another 155 MB to the repository’s history, so squash or drop data
  commits you don’t intend to keep.

The largest single file is about 7 MB, well inside GitHub’s 100 MB per-file limit, so the data
stays in plain Git rather than needing Git LFS.

## Themes and synonyms

Edit `data/synonyms.json` (a JSON object of `theme: [aliases]`), then run `npm run data:registry`
to publish the copy the app loads. Themes are also used to generate per-verse `tags`, so re-running
`npm run data:all` re-tags the corpus.

## Deployment

The build uses `base: './'` and hash-based routing, so it works from any sub-path.

### GitHub Pages

The included workflow `.github/workflows/deploy.yml` builds the site and publishes it on every
push to `main` (or from the Actions tab, “Run workflow”). Enable it once: **Settings → Pages →
Build and deployment → Source: GitHub Actions**. No secrets or environment variables are needed.

To publish by hand instead:

```bash
npm run build
npx gh-pages -d dist        # publishes dist/ to the gh-pages branch
```

### Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- No environment variables or server runtime required.

Any static host works. The `public/data` folder is ~155 MB (including ~33 MB of gzipped search
indexes), so check your host’s file and size limits; GitHub Pages’ 1 GB limit is ample.

## PWA and offline behaviour

`vite-plugin-pwa` generates the manifest and service worker. The app shell, fonts and icons are
precached; collection JSON and indexes are cached the first time they are fetched. Search indexes
are gzip files inflated with the browser’s `DecompressionStream` — supported by current Android
Chrome, Edge, Safari 16.4+ and Firefox 113+. Very old browsers will load the app but cannot
decompress the offline search index.

## Design decisions and limits

- **No invented scripture.** If an openly licensed digital edition could not be verified, the text
  is listed in the registry as not bundled, with a reason, instead of being generated or
  paraphrased.
- **Search index scope.** Results are drawn from translations, transliterations and theme tags;
  original-language text is shown when reading a chapter. This keeps the index small enough for a
  phone.
- **Auto-transliteration.** Where a source provides no transliteration (Hebrew and Greek in the
  Bible, Arabic hadith), it is generated with a script-aware romaniser and each verse is flagged
  `autoTranslit` and labelled “auto-transliterated” in the UI. The scripture text itself is never
  altered.
- **Grouping and ranking.** Results can be grouped neutrally by religion (default) or ordered by
  relevance. No tradition is promoted.
- **Translations differ.** Translations are interpretations. Every card and the About page say so.

## Licensing

App code: MIT. Bundled scripture translations retain their source licenses — see
[SOURCES.md](SOURCES.md) for the full ledger. Do not reuse a bundled translation commercially
without checking its own license.

## Credits

Data providers: Tanzil / Quran.com via alquran.cloud, the open hadith-api dataset, openscriptures
(morphhb), Faithlife SBLGNT, the KJV JSON edition, AdiyogiArts gita-json and the VedicScriptures
project, Wikisource and the Sacred Books of the East translators, BaniDB / Shabad OS, and Sefaria
for Hebrew reference. Built with React, Vite, Tailwind and MiniSearch.
