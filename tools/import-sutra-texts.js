const fs = require("fs");
const path = require("path");

const Translit = require("../js/transliteration.js");

const ROOT = path.join(__dirname, "..");
const inputFileName = process.argv[2] || "sutra-texts.tsv";
const INPUT_FILE = path.join(ROOT, "data", "raw", inputFileName);
const OUTPUT_FILE = path.join(ROOT, "data", "generated", "sutra-texts.json");

function readSourceFile() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Missing input file: ${INPUT_FILE}`);
    process.exit(1);
  }

  return fs.readFileSync(INPUT_FILE, "utf8").replace(/^\uFEFF/, "");
}

function parseLine(line, index) {
  const trimmed = line.trim();

  if (!trimmed) return null;

  if (index === 0 && /^code\s+text$/i.test(trimmed.replace(/\t+/g, " "))) {
    return null;
  }

  const tabParts = trimmed.split(/\t+/);

  let code;
  let slp1;

  if (tabParts.length >= 2) {
    code = tabParts[0].trim();
    slp1 = tabParts.slice(1).join(" ").trim();
  } else {
    const match = trimmed.match(/^(\d+\.\d+\.\d+)\s+(.+)$/);

    if (!match) {
      return {
        error: `Could not parse line ${index + 1}`,
        raw: line
      };
    }

    code = match[1].trim();
    slp1 = match[2].trim();
  }

  if (!code || !slp1) {
    return {
      error: `Missing code or text at line ${index + 1}`,
      raw: line
    };
  }

  return {
    code,
    slp1,
    deva: Translit.slp1ToDeva(slp1),
    iast: Translit.slp1ToIast(slp1)
  };
}

function main() {
  const text = readSourceFile();
  const lines = text.split(/\r?\n/);

  const sutras = {};
  const errors = [];

  lines.forEach((line, index) => {
    const parsed = parseLine(line, index);

    if (!parsed) return;

    if (parsed.error) {
      errors.push(parsed);
      return;
    }

    sutras[parsed.code] = {
      code: parsed.code,
      slp1: parsed.slp1,
      deva: parsed.deva,
      iast: parsed.iast
    };
  });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(sutras, null, 2),
    "utf8"
  );

  console.log("Sutra text import complete.");
  console.log(`Input file: ${inputFileName}`);
  console.log(`Sutras:     ${Object.keys(sutras).length}`);
  console.log(`Errors:     ${errors.length}`);
  console.log("");
  console.log("Generated:");
  console.log("  data/generated/sutra-texts.json");

  if (errors.length) {
    console.log("");
    console.log("Errors:");
    console.table(errors.slice(0, 10));
  }
}

main();
