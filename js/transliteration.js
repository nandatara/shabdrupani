(function (global) {
  "use strict";

  const SLP1_VOWELS = new Set(["a", "A", "i", "I", "u", "U", "f", "F", "x", "X", "e", "E", "o", "O"]);

  const SLP1_CONSONANTS = new Set([
    "k", "K", "g", "G", "N",
    "c", "C", "j", "J", "Y",
    "w", "W", "q", "Q", "R",
    "t", "T", "d", "D", "n",
    "p", "P", "b", "B", "m",
    "y", "r", "l", "v",
    "S", "z", "s", "h",
    "L"
  ]);

  const DEVA_INDEPENDENT_VOWELS = {
    "अ": "a", "आ": "A",
    "इ": "i", "ई": "I",
    "उ": "u", "ऊ": "U",
    "ऋ": "f", "ॠ": "F",
    "ऌ": "x", "ॡ": "X",
    "ए": "e", "ऐ": "E",
    "ओ": "o", "औ": "O"
  };

  const DEVA_VOWEL_SIGNS = {
    "ा": "A",
    "ि": "i",
    "ी": "I",
    "ु": "u",
    "ू": "U",
    "ृ": "f",
    "ॄ": "F",
    "ॢ": "x",
    "ॣ": "X",
    "े": "e",
    "ै": "E",
    "ो": "o",
    "ौ": "O"
  };

  const DEVA_CONSONANTS = {
    "क": "k", "ख": "K", "ग": "g", "घ": "G", "ङ": "N",
    "च": "c", "छ": "C", "ज": "j", "झ": "J", "ञ": "Y",
    "ट": "w", "ठ": "W", "ड": "q", "ढ": "Q", "ण": "R",
    "त": "t", "थ": "T", "द": "d", "ध": "D", "न": "n",
    "प": "p", "फ": "P", "ब": "b", "भ": "B", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "S", "ष": "z", "स": "s", "ह": "h",
    "ळ": "L"
  };

  const DEVA_SIGNS = {
    "ं": "M",
    "ँ": "~",
    "ः": "H",
    "ऽ": "'",
    "ॐ": "oM"
  };

  const VIRAMA = "्";

  const SLP1_TO_DEVA_VOWELS = {
    "a": "अ", "A": "आ",
    "i": "इ", "I": "ई",
    "u": "उ", "U": "ऊ",
    "f": "ऋ", "F": "ॠ",
    "x": "ऌ", "X": "ॡ",
    "e": "ए", "E": "ऐ",
    "o": "ओ", "O": "औ"
  };

  const SLP1_TO_DEVA_VOWEL_SIGNS = {
    "a": "",
    "A": "ा",
    "i": "ि",
    "I": "ी",
    "u": "ु",
    "U": "ू",
    "f": "ृ",
    "F": "ॄ",
    "x": "ॢ",
    "X": "ॣ",
    "e": "े",
    "E": "ै",
    "o": "ो",
    "O": "ौ"
  };

  const SLP1_TO_DEVA_CONSONANTS = {
    "k": "क", "K": "ख", "g": "ग", "G": "घ", "N": "ङ",
    "c": "च", "C": "छ", "j": "ज", "J": "झ", "Y": "ञ",
    "w": "ट", "W": "ठ", "q": "ड", "Q": "ढ", "R": "ण",
    "t": "त", "T": "थ", "d": "द", "D": "ध", "n": "न",
    "p": "प", "P": "फ", "b": "ब", "B": "भ", "m": "म",
    "y": "य", "r": "र", "l": "ल", "v": "व",
    "S": "श", "z": "ष", "s": "स", "h": "ह",
    "L": "ळ"
  };

  const SLP1_TO_IAST = {
    "a": "a", "A": "ā",
    "i": "i", "I": "ī",
    "u": "u", "U": "ū",
    "f": "ṛ", "F": "ṝ",
    "x": "ḷ", "X": "ḹ",
    "e": "e", "E": "ai",
    "o": "o", "O": "au",

    "k": "k", "K": "kh", "g": "g", "G": "gh", "N": "ṅ",
    "c": "c", "C": "ch", "j": "j", "J": "jh", "Y": "ñ",
    "w": "ṭ", "W": "ṭh", "q": "ḍ", "Q": "ḍh", "R": "ṇ",
    "t": "t", "T": "th", "d": "d", "D": "dh", "n": "n",
    "p": "p", "P": "ph", "b": "b", "B": "bh", "m": "m",
    "y": "y", "r": "r", "l": "l", "v": "v",
    "S": "ś", "z": "ṣ", "s": "s", "h": "h",
    "L": "ḻ",

    "M": "ṃ",
    "H": "ḥ",
    "~": "m̐",
    "'": "’"
  };

  function devaToSlp1(input) {
    const chars = Array.from(input || "");
    let out = "";

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const next = chars[i + 1];

      if (DEVA_INDEPENDENT_VOWELS[ch]) {
        out += DEVA_INDEPENDENT_VOWELS[ch];
        continue;
      }

      if (DEVA_CONSONANTS[ch]) {
        out += DEVA_CONSONANTS[ch];

        if (next === VIRAMA) {
          i += 1;
        } else if (DEVA_VOWEL_SIGNS[next]) {
          out += DEVA_VOWEL_SIGNS[next];
          i += 1;
        } else {
          out += "a";
        }

        continue;
      }

      if (DEVA_SIGNS[ch]) {
        out += DEVA_SIGNS[ch];
        continue;
      }

      if (DEVA_VOWEL_SIGNS[ch]) {
        out += DEVA_VOWEL_SIGNS[ch];
        continue;
      }

      out += ch;
    }

    return out;
  }

  function slp1ToDeva(input) {
    const chars = Array.from(input || "");
    let out = "";

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const next = chars[i + 1];

      if (SLP1_CONSONANTS.has(ch)) {
        out += SLP1_TO_DEVA_CONSONANTS[ch] || ch;

        if (SLP1_VOWELS.has(next)) {
          out += SLP1_TO_DEVA_VOWEL_SIGNS[next];
          i += 1;
        } else {
          out += VIRAMA;
        }

        continue;
      }

      if (SLP1_VOWELS.has(ch)) {
        out += SLP1_TO_DEVA_VOWELS[ch] || ch;
        continue;
      }

      if (ch === "M") {
        out += "ं";
        continue;
      }

      if (ch === "H") {
        out += "ः";
        continue;
      }

      if (ch === "'") {
        out += "ऽ";
        continue;
      }

      out += ch;
    }

    return out;
  }

  function slp1ToIast(input) {
    return Array.from(input || "")
      .map(ch => SLP1_TO_IAST[ch] || ch)
      .join("");
  }

  function stripIastDiacritics(input) {
    return (input || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ṁ/g, "m")
      .replace(/ṃ/g, "m")
      .replace(/ḥ/g, "h")
      .toLowerCase();
  }

  function iastToSlp1(input) {
    let s = (input || "").normalize("NFC").toLowerCase();

    const replacements = [
      ["kh", "K"], ["gh", "G"], ["ch", "C"], ["jh", "J"],
      ["ṭh", "W"], ["ḍh", "Q"], ["th", "T"], ["dh", "D"],
      ["ph", "P"], ["bh", "B"],
      ["ai", "E"], ["au", "O"],

      ["ā", "A"], ["ī", "I"], ["ū", "U"],
      ["ṛ", "f"], ["ṝ", "F"], ["ḷ", "x"], ["ḹ", "X"],
      ["ṅ", "N"], ["ñ", "Y"], ["ṭ", "w"], ["ḍ", "q"], ["ṇ", "R"],
      ["ś", "S"], ["ṣ", "z"], ["ṃ", "M"], ["ṁ", "M"], ["ḥ", "H"]
    ];

    for (const [from, to] of replacements) {
      s = s.split(from).join(to);
    }

    return s;
  }

  const api = {
    SLP1_VOWELS,
    SLP1_CONSONANTS,
    devaToSlp1,
    slp1ToDeva,
    slp1ToIast,
    iastToSlp1,
    stripIastDiacritics
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.Translit = api;

})(typeof window !== "undefined" ? window : globalThis);
