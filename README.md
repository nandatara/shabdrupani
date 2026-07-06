# Shabdrupāṇi

**Shabdrupāṇi** is a static Sanskrit declension-table web app.

Live site:

https://shabdrupani.gtnmtn.org

The app provides searchable, validated śabdarūpa tables for Sanskrit prātipadikas, using data derived from ashtadhyayi.com and organized for fast browser-based lookup.

## Phase 1 Status

Phase 1 is complete.

Current features:

- 9007 prātipadika entries
- Validated static declension tables
- Search in Devanāgarī, IAST, SLP1, and loose ASCII
- Ending-based and gender-based filters
- Dynamic declension-table rendering
- Display modes:
  - Devanāgarī + IAST
  - Devanāgarī
  - IAST
  - SLP1
- Selected-word profile panel
- Recently viewed stems
- Lazy-loaded declension-table chunks
- GitHub Pages deployment
- Custom domain support

## Architecture

This is a pure static web app.

No backend server is required.

```text
index.html
css/
js/
data/
docs/
tools/

The browser loads:

data/generated/shabda-index.json
data/generated/filter-counts.json

at startup.

Declension tables are loaded lazily from:

data/generated/tables/

only when a user selects a stem.

Data Pipeline

Raw source data is placed in:

data/raw/

The importer script is:

tools/import-shabda-data.js

To regenerate generated data:

node tools/import-shabda-data.js shabdapatha_v2.txt

Generated output:

data/generated/shabda-index.json
data/generated/filter-counts.json
data/generated/import-report.json
data/generated/tables/
Local Development

Run a local server from the project root:

python -m http.server 8080

Then open:

http://localhost:8080

Do not open index.html directly by double-clicking, because the app uses fetch() to load JSON files.

Deployment

The app is deployed through GitHub Pages.

Custom domain:

shabdrupani.gtnmtn.org

The root CNAME file must contain:

shabdrupani.gtnmtn.org
Phase 2 Direction

Phase 2 will focus on dynamic derivations.

The intended direction is to study Ambuda's Vidyut project, especially vidyut-prakriya, and explore whether its WASM build can be integrated into this app.

Phase 1 static forms will remain the authoritative validated display layer.

Phase 2 dynamic derivations should be added as an explanatory layer, not as a replacement for the validated table data.

Encoding Policy

Internal working encoding:

SLP1

Display encodings:

Devanāgarī
IAST
SLP1

The transliteration module handles:

Devanāgarī ⇄ SLP1
IAST ⇄ SLP1
SLP1 → Devanāgarī
SLP1 → IAST
License and Attribution

Data source: ashtadhyayi.com-derived śabdapāṭha data.

This repository is currently a research and educational project.
