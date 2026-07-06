# Data Pipeline

## Source Data

Raw śabdapāṭha data is stored in:

```text
data/raw/

The full source file currently used is:

shabdapatha_v2.txt

The source format is a JSON-like object with a top-level data array.

Each entry contains fields such as:

urlid
word
linga
artha
artha_hin
artha_eng
forms
zbaseindex
Forms

The forms field contains 24 semicolon-separated forms:

8 vibhaktis × 3 vacanas = 24 cells

Order:

प्रथमा:    sg du pl
द्वितीया:  sg du pl
तृतीया:    sg du pl
चतुर्थी:   sg du pl
पञ्चमी:    sg du pl
षष्ठी:     sg du pl
सप्तमी:    sg du pl
सम्बोधन:  sg du pl
Importer

Importer script:

tools/import-shabda-data.js

Run:

node tools/import-shabda-data.js shabdapatha_v2.txt
Generated Files

The importer creates:

data/generated/shabda-index.json
data/generated/filter-counts.json
data/generated/import-report.json
data/generated/tables/
Lazy Loading

The app does not load all tables at startup.

Startup loads:

shabda-index.json
filter-counts.json

When the user selects a word, the app reads the tableFile field from the index and loads the corresponding chunk from:

data/generated/tables/
Validation

The importer validates:

- source has a data array
- each entry has 24 form cells
- duplicate urlids are detected
- unknown linga codes are reported
- filter counts are generated
- table chunks are generated

Validation report:

data/generated/import-report.json

After importing, check:

grep -n "invalidEntries" data/generated/import-report.json
grep -n "formCellErrors" data/generated/import-report.json
Encoding

The app uses SLP1 internally.

Generated table forms store:

Devanāgarī
SLP1
IAST

for each form alternative.
