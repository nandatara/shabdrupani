const fs = require("fs");
const path = require("path");

const Translit = require("../js/transliteration.js");

const ROOT = path.join(__dirname, "..");
const INPUT_FILE = path.join(ROOT, "data", "raw", "sample_data_shabd.txt");
const OUTPUT_DIR = path.join(ROOT, "data", "generated");

const CASES = [
  { key: "1", deva: "प्रथमा", iast: "prathamā" },
  { key: "2", deva: "द्वितीया", iast: "dvitīyā" },
  { key: "3", deva: "तृतीया", iast: "tṛtīyā" },
  { key: "4", deva: "चतुर्थी", iast: "caturthī" },
  { key: "5", deva: "पञ्चमी", iast: "pañcamī" },
  { key: "6", deva: "षष्ठी", iast: "ṣaṣṭhī" },
  { key: "7", deva: "सप्तमी", iast: "saptamī" },
  { key: "8", deva: "सम्बोधन", iast: "sambodhana" }
];

const NUMBERS = [
  { key: "sg", deva: "एकवचन", iast: "ekavacana" },
  { key: "du", deva: "द्विवचन", iast: "dvivacana" },
  { key: "pl", deva: "बहुवचन", iast: "bahuvacana" }
];

const LINGA_MAP = {
  P: {
    code: "P",
    deva: "पुंलिङ्ग",
    iast: "puṃliṅga",
    english: "masculine"
  },
  S: {
    code: "S",
    deva: "स्त्रीलिङ्ग",
    iast: "strīliṅga",
    english: "feminine"
  },
  F: {
    code: "F",
    deva: "स्त्रीलिङ्ग",
    iast: "strīliṅga",
    english: "feminine"
  },
  N: {
    code: "N",
    deva: "नपुंसकलिङ्ग",
    iast: "napuṃsakaliṅga",
    english: "neuter"
  }
};

function readSourceFile() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Missing input file: ${INPUT_FILE}`);
    process.exit(1);
  }

  return fs.readFileSync(INPUT_FILE, "utf8").replace(/^\uFEFF/, "");
}

function parseSource(text) {
  try {
    return JSON.parse(text);
  } catch (firstError) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start >= 0 && end > start) {
      const sliced = text.slice(start, end + 1);
      return JSON.parse(sliced);
    }

    throw firstError;
  }
}

function cleanId(urlid, fallbackIndex) {
  if (!urlid) return `entry_${fallbackIndex + 1}`;
  return String(urlid).trim().replace(/^@/, "");
}

function splitAlternativeForms(cell) {
  const normalized = String(cell || "")
    .trim()
    .replace(/[–—]/g, "-");

  if (!normalized) return [];

  return normalized
    .split("-")
    .map(x => x.trim())
    .filter(Boolean)
    .map(deva => {
      const slp1 = Translit.devaToSlp1(deva);
      return {
        deva,
        slp1,
        iast: Translit.slp1ToIast(slp1)
      };
    });
}

function parseForms(formsString) {
  const cells = String(formsString || "")
    .split(";")
    .map(x => x.trim());

  if (cells.length !== 24) {
    throw new Error(`Expected 24 form cells, found ${cells.length}`);
  }

  const forms = {};
  let index = 0;

  for (const vibhakti of CASES) {
    forms[vibhakti.key] = {};

    for (const vacana of NUMBERS) {
      forms[vibhakti.key][vacana.key] = splitAlternativeForms(cells[index]);
      index += 1;
    }
  }

  return forms;
}

function getFinalSoundSlp1(slp1) {
  const chars = Array.from(slp1 || "").filter(ch =>
    Translit.SLP1_VOWELS.has(ch) || Translit.SLP1_CONSONANTS.has(ch)
  );

  if (chars.length === 0) return "";

  return chars[chars.length - 1];
}

function increment(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

function sortedObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );
}

function normalizeEntry(entry, index, seenIds, report) {
  let id = cleanId(entry.urlid, index);

  if (seenIds.has(id)) {
    report.duplicateUrlids.push({
      urlid: entry.urlid,
      generatedId: `${id}_${index + 1}`,
      word: entry.word || ""
    });

    id = `${id}_${index + 1}`;
  }

  seenIds.add(id);

  const wordDeva = String(entry.word || "").trim();
  const wordSlp1 = Translit.devaToSlp1(wordDeva);
  const wordIast = Translit.slp1ToIast(wordSlp1);
  const wordAscii = Translit.stripIastDiacritics(wordIast);

  const lingaCode = String(entry.linga || "").trim();
  const linga = LINGA_MAP[lingaCode] || {
    code: lingaCode || "UNKNOWN",
    deva: "अज्ञातलिङ्ग",
    iast: "ajñātaliṅga",
    english: "unknown"
  };

  if (!LINGA_MAP[lingaCode]) {
    report.unknownLingaCodes.push({
      id,
      word: wordDeva,
      linga: lingaCode
    });
  }

  const endingSlp1 = getFinalSoundSlp1(wordSlp1);
  const endingType = Translit.SLP1_VOWELS.has(endingSlp1) ? "vowel" : "consonant";
  const endingDeva = Translit.slp1ToDeva(endingSlp1);
  const endingIast = Translit.slp1ToIast(endingSlp1);
  const filterKey = `${endingType}:${endingSlp1}:${linga.code}`;

  let forms;

  try {
    forms = parseForms(entry.forms);
  } catch (error) {
    report.formCellErrors.push({
      id,
      word: wordDeva,
      linga: lingaCode,
      error: error.message,
      formsPreview: String(entry.forms || "").slice(0, 200)
    });

    forms = null;
  }

  const tableEntry = {
    id,
    urlid: entry.urlid || "",
    zbaseindex: entry.zbaseindex || "",
    word: {
      deva: wordDeva,
      slp1: wordSlp1,
      iast: wordIast,
      ascii: wordAscii
    },
    linga,
    meaning: {
      sanskrit: entry.artha || "",
      hindi: entry.artha_hin || "",
      english: entry.artha_eng || ""
    },
    notes: {
      sk: entry.sk || "",
      lsk: entry.lsk || "",
      vyutpatti: entry.vyutpatti || "",
      shabda_notes: entry.shabda_notes || "",
      info: entry.info || ""
    },
    prakriya_options: entry.prakriya_options || {},
    ending: {
      type: endingType,
      slp1: endingSlp1,
      deva: endingDeva,
      iast: endingIast
    },
    filterKey,
    forms
  };

  const indexEntry = {
    id,
    urlid: entry.urlid || "",
    zbaseindex: entry.zbaseindex || "",
    deva: wordDeva,
    slp1: wordSlp1,
    iast: wordIast,
    ascii: wordAscii,
    linga: linga.code,
    gender: linga.english,
    meaning: entry.artha_eng || entry.artha_hin || entry.artha || "",
    artha: entry.artha || "",
    endingType,
    endingSlp1,
    endingDeva,
    endingIast,
    filterKey
  };

  return { tableEntry, indexEntry };
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sourceText = readSourceFile();
  const source = parseSource(sourceText);

  if (!source || !Array.isArray(source.data)) {
    throw new Error("Expected source object with a data array.");
  }

  const report = {
    sourceName: source.name || "",
    inputFile: path.relative(ROOT, INPUT_FILE).replace(/\\/g, "/"),
    totalEntries: source.data.length,
    validEntries: 0,
    invalidEntries: 0,
    lingaCounts: {},
    endingCounts: {},
    filterCounts: {},
    duplicateUrlids: [],
    unknownLingaCodes: [],
    formCellErrors: []
  };

  const seenIds = new Set();
  const indexEntries = [];
  const tableEntries = {};

  for (let i = 0; i < source.data.length; i++) {
    const entry = source.data[i];
    const { tableEntry, indexEntry } = normalizeEntry(entry, i, seenIds, report);

    indexEntries.push(indexEntry);
    tableEntries[tableEntry.id] = tableEntry;

    increment(report.lingaCounts, tableEntry.linga.code);
    increment(report.endingCounts, `${tableEntry.ending.type}:${tableEntry.ending.slp1}`);
    increment(report.filterCounts, tableEntry.filterKey);

    if (tableEntry.forms) {
      report.validEntries += 1;
    } else {
      report.invalidEntries += 1;
    }
  }

  report.lingaCounts = sortedObject(report.lingaCounts);
  report.endingCounts = sortedObject(report.endingCounts);
  report.filterCounts = sortedObject(report.filterCounts);

  const filterCounts = Object.entries(report.filterCounts).map(([key, count]) => {
    const [endingType, endingSlp1, lingaCode] = key.split(":");
    const linga = LINGA_MAP[lingaCode] || { english: "unknown", deva: "अज्ञातलिङ्ग", iast: "ajñātaliṅga" };

    return {
      key,
      count,
      endingType,
      endingSlp1,
      endingDeva: Translit.slp1ToDeva(endingSlp1),
      endingIast: Translit.slp1ToIast(endingSlp1),
      linga: lingaCode,
      gender: linga.english,
      genderDeva: linga.deva,
      genderIast: linga.iast
    };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "shabda-index.json"),
    JSON.stringify(indexEntries, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "shabda-tables.json"),
    JSON.stringify(tableEntries, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "filter-counts.json"),
    JSON.stringify(filterCounts, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "import-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("Import complete.");
  console.log(`Total entries:   ${report.totalEntries}`);
  console.log(`Valid entries:   ${report.validEntries}`);
  console.log(`Invalid entries: ${report.invalidEntries}`);
  console.log("");
  console.log("Generated:");
  console.log("  data/generated/shabda-index.json");
  console.log("  data/generated/shabda-tables.json");
  console.log("  data/generated/filter-counts.json");
  console.log("  data/generated/import-report.json");

  if (report.formCellErrors.length > 0) {
    console.log("");
    console.log(`WARNING: ${report.formCellErrors.length} form-cell errors found.`);
    console.log("Check data/generated/import-report.json");
  }

  if (report.unknownLingaCodes.length > 0) {
    console.log("");
    console.log(`WARNING: ${report.unknownLingaCodes.length} unknown linga codes found.`);
    console.log("Check data/generated/import-report.json");
  }
}

main();
