const fs = require("fs");
const path = require("path");

const Translit = require("../js/transliteration.js");

const ROOT = path.join(__dirname, "..");
const inputFileName = process.argv[2] || "shabdaprakriya.txt";
const INPUT_FILE = path.join(ROOT, "data", "raw", inputFileName);
const OUTPUT_DIR = path.join(ROOT, "data", "generated");
const PRAKRIYA_DIR = path.join(OUTPUT_DIR, "prakriya");

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
      return JSON.parse(text.slice(start, end + 1));
    }

    throw firstError;
  }
}

function normalizeBaseIndex(baseindex) {
  const raw = String(baseindex || "").trim();

  const match = raw.match(/^0*(\d+)\.0*(\d+)$/);

  if (!match) {
    return raw;
  }

  return `${Number(match[1])}.${Number(match[2])}`;
}

function baseChunkFile(baseindex) {
  const raw = String(baseindex || "unknown").trim();
  const major = raw.includes(".") ? raw.split(".")[0] : "unknown";
  const safeMajor = major || "unknown";

  return `prakriya/base-${safeMajor}.json`;
}

function cleanIdPart(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "_");
}

function makeDerivationId(entry, index) {
  const base = cleanIdPart(entry.baseindex || "unknown");
  const vib = cleanIdPart(entry.vibhakti || "x");
  const vac = cleanIdPart(entry.vachan || "x");
  const formSlp1 = Translit.devaToSlp1(String(entry.form || "").trim());

  return `${base}_${vib}_${vac}_${formSlp1 || "form"}_${index + 1}`;
}

function normalizeStep(stepObj, stepIndex) {
  const stepDeva = String(stepObj.step || "").trim();
  const stepSlp1 = Translit.devaToSlp1(stepDeva);

  return {
    index: stepIndex + 1,
    deva: stepDeva,
    slp1: stepSlp1,
    iast: Translit.slp1ToIast(stepSlp1),
    sutras: Array.isArray(stepObj.sutras)
      ? stepObj.sutras.map(String)
      : []
  };
}

function normalizeEntry(entry, index, report) {
  const id = makeDerivationId(entry, index);

  const wordDeva = String(entry.word || "").trim();
  const wordSlp1 = Translit.devaToSlp1(wordDeva);

  const formDeva = String(entry.form || "").trim();
  const formSlp1 = Translit.devaToSlp1(formDeva);

  const baseindexRaw = String(entry.baseindex || "").trim();
  const baseindexNorm = normalizeBaseIndex(baseindexRaw);

  const vibhakti = String(entry.vibhakti || "").trim();
  const vachan = String(entry.vachan || "").trim();

  const chunkFile = baseChunkFile(baseindexRaw);

  const steps = Array.isArray(entry.steps)
    ? entry.steps.map((step, stepIndex) => normalizeStep(step, stepIndex))
    : [];

  if (!wordDeva) {
    report.missingWord.push({ id, index });
  }

  if (!formDeva) {
    report.missingForm.push({ id, index, word: wordDeva });
  }

  if (!baseindexRaw) {
    report.missingBaseindex.push({ id, index, word: wordDeva, form: formDeva });
  }

  if (!vibhakti || !vachan) {
    report.missingCaseNumber.push({
      id,
      index,
      word: wordDeva,
      form: formDeva,
      vibhakti,
      vachan
    });
  }

  if (!steps.length) {
    report.emptySteps.push({
      id,
      index,
      word: wordDeva,
      form: formDeva,
      baseindex: baseindexRaw
    });
  }

  const key = `${baseindexNorm}|${vibhakti}|${vachan}|${formSlp1}`;

  const fullEntry = {
    id,
    key,
    baseindex: {
      raw: baseindexRaw,
      normalized: baseindexNorm
    },
    word: {
      deva: wordDeva,
      slp1: wordSlp1,
      iast: Translit.slp1ToIast(wordSlp1)
    },
    form: {
      deva: formDeva,
      slp1: formSlp1,
      iast: Translit.slp1ToIast(formSlp1)
    },
    vibhakti,
    vachan,
    chunkFile,
    steps
  };

  const indexEntry = {
    id,
    key,
    baseindexRaw,
    baseindexNorm,
    wordDeva,
    wordSlp1,
    wordIast: Translit.slp1ToIast(wordSlp1),
    formDeva,
    formSlp1,
    formIast: Translit.slp1ToIast(formSlp1),
    vibhakti,
    vachan,
    stepCount: steps.length,
    chunkFile
  };

  return { fullEntry, indexEntry };
}

function increment(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

function sortedObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );
}

function removeOldGeneratedPrakriya() {
  if (fs.existsSync(PRAKRIYA_DIR)) {
    fs.rmSync(PRAKRIYA_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(PRAKRIYA_DIR, { recursive: true });
}

function buildPrakriyaLookup(indexEntries) {
  const lookup = {};

  for (const entry of indexEntries) {
    if (!lookup[entry.key]) {
      lookup[entry.key] = [];
    }

    lookup[entry.key].push({
      id: entry.id,
      chunkFile: entry.chunkFile,
      stepCount: entry.stepCount,
      wordDeva: entry.wordDeva,
      wordSlp1: entry.wordSlp1,
      formDeva: entry.formDeva,
      formSlp1: entry.formSlp1,
      formIast: entry.formIast,
      baseindexRaw: entry.baseindexRaw,
      baseindexNorm: entry.baseindexNorm,
      vibhakti: entry.vibhakti,
      vachan: entry.vachan
    });
  }

  return lookup;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  removeOldGeneratedPrakriya();

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
    chunkCount: 0,
    baseindexCounts: {},
    normalizedBaseindexCounts: {},
    caseNumberCounts: {},
    duplicateKeys: [],
    missingWord: [],
    missingForm: [],
    missingBaseindex: [],
    missingCaseNumber: [],
    emptySteps: []
  };

  const seenKeys = new Map();
  const indexEntries = [];
  const chunks = {};

  for (let i = 0; i < source.data.length; i++) {
    const rawEntry = source.data[i];
    const { fullEntry, indexEntry } = normalizeEntry(rawEntry, i, report);

    if (seenKeys.has(indexEntry.key)) {
      report.duplicateKeys.push({
        key: indexEntry.key,
        firstId: seenKeys.get(indexEntry.key),
        secondId: indexEntry.id
      });
    } else {
      seenKeys.set(indexEntry.key, indexEntry.id);
    }

    indexEntries.push(indexEntry);

    if (!chunks[fullEntry.chunkFile]) {
      chunks[fullEntry.chunkFile] = {};
    }

    chunks[fullEntry.chunkFile][fullEntry.id] = fullEntry;

    increment(report.baseindexCounts, indexEntry.baseindexRaw);
    increment(report.normalizedBaseindexCounts, indexEntry.baseindexNorm);
    increment(report.caseNumberCounts, `${indexEntry.vibhakti}.${indexEntry.vachan}`);
    
    
    report.validEntries += 1;
  }

  report.chunkCount = Object.keys(chunks).length;
  report.baseindexCounts = sortedObject(report.baseindexCounts);
  report.normalizedBaseindexCounts = sortedObject(report.normalizedBaseindexCounts);
  report.caseNumberCounts = sortedObject(report.caseNumberCounts);
  const prakriyaLookup = buildPrakriyaLookup(indexEntries);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "prakriya-index.json"),
    JSON.stringify(indexEntries, null, 2),
    "utf8"
  );
  
  fs.writeFileSync(
  path.join(OUTPUT_DIR, "prakriya-lookup.json"),
  JSON.stringify(prakriyaLookup, null, 2),
  "utf8"
  );

  for (const [relativeFile, chunk] of Object.entries(chunks)) {
    const outputPath = path.join(OUTPUT_DIR, relativeFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(
      outputPath,
      JSON.stringify(chunk, null, 2),
      "utf8"
    );
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "prakriya-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("Prakriya import complete.");
  console.log(`Input file:      ${inputFileName}`);
  console.log(`Total entries:   ${report.totalEntries}`);
  console.log(`Valid entries:   ${report.validEntries}`);
  console.log(`Chunks:          ${report.chunkCount}`);
  console.log("");
  console.log("Generated:");
  console.log("  data/generated/prakriya-index.json");
  console.log(`  data/generated/prakriya/ (${report.chunkCount} chunks)`);
  console.log("  data/generated/prakriya-report.json");
  console.log("  data/generated/prakriya-lookup.json");

  if (report.duplicateKeys.length) {
    console.log("");
    console.log(`WARNING: ${report.duplicateKeys.length} duplicate derivation keys found.`);
  }

  if (report.emptySteps.length) {
    console.log("");
    console.log(`WARNING: ${report.emptySteps.length} entries have empty steps.`);
  }
}

main();
