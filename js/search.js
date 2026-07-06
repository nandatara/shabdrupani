(function (global) {
  "use strict";

  function hasDevanagari(text) {
    return /[\u0900-\u097F]/.test(text || "");
  }

  function hasIastDiacritics(text) {
    return /[āīūṛṝḷḹṅñṭḍṇśṣṃṁḥ]/i.test(text || "");
  }

  function hasSlp1Signature(text) {
    return /[AIUfFxXeEoOKGNCJYWqQRWTDPSzL]/.test(text || "");
  }

  function normalizeText(text) {
    return String(text || "").trim().normalize("NFC");
  }

  function lower(text) {
    return String(text || "").toLowerCase();
  }

  function uniqueCandidates(candidates) {
    const seen = new Set();
    const out = [];

    for (const candidate of candidates) {
      if (!candidate.value) continue;

      const key = `${candidate.kind}:${candidate.value}:${candidate.baseScore}`;

      if (!seen.has(key)) {
        seen.add(key);
        out.push(candidate);
      }
    }

    return out;
  }

  function analyzeQuery(query) {
    const raw = normalizeText(query);

    if (!raw) {
      return {
        raw: "",
        hasQuery: false,
        candidates: []
      };
    }

    const candidates = [];
    const rawLower = lower(raw);

    candidates.push({
      kind: "raw",
      value: raw,
      baseScore: 0
    });

    candidates.push({
      kind: "raw-lower",
      value: rawLower,
      baseScore: 1
    });

    if (hasDevanagari(raw)) {
      const slp1 = Translit.devaToSlp1(raw);
      const iast = Translit.slp1ToIast(slp1);
      const ascii = Translit.stripIastDiacritics(iast);

      candidates.push({ kind: "deva", value: raw, baseScore: 0 });
      candidates.push({ kind: "slp1", value: slp1, baseScore: 0 });
      candidates.push({ kind: "iast", value: iast, baseScore: 2 });
      candidates.push({ kind: "ascii", value: ascii, baseScore: 6 });
    } else {
      const fromIast = Translit.iastToSlp1(raw);
      const ascii = Translit.stripIastDiacritics(raw);

      candidates.push({ kind: "slp1", value: raw, baseScore: hasSlp1Signature(raw) ? 0 : 2 });
      candidates.push({ kind: "slp1-from-iast", value: fromIast, baseScore: hasIastDiacritics(raw) ? 0 : 3 });
      candidates.push({ kind: "iast", value: raw, baseScore: hasIastDiacritics(raw) ? 0 : 4 });
      candidates.push({ kind: "ascii", value: ascii, baseScore: 7 });

      if (fromIast !== raw) {
        candidates.push({
          kind: "iast-from-slp1",
          value: Translit.slp1ToIast(fromIast),
          baseScore: 4
        });
      }
    }

    return {
      raw,
      hasQuery: true,
      candidates: uniqueCandidates(candidates)
    };
  }

  function fieldValues(entry) {
    return [
      { name: "deva", value: entry.deva || "", weight: 0 },
      { name: "slp1", value: entry.slp1 || "", weight: 1 },
      { name: "iast", value: entry.iast || "", weight: 2 },
      { name: "ascii", value: entry.ascii || "", weight: 6 }
    ];
  }

  function matchScore(fieldValue, queryValue, allowContains) {
    if (!fieldValue || !queryValue) return Infinity;

    const f = String(fieldValue);
    const q = String(queryValue);

    if (f === q) return 0;
    if (lower(f) === lower(q)) return 1;

    if (f.startsWith(q)) return 20;
    if (lower(f).startsWith(lower(q))) return 21;

    if (allowContains && lower(f).includes(lower(q))) return 80;

    return Infinity;
  }

  function scoreEntry(entry, queryAnalysis) {
    if (!queryAnalysis.hasQuery) {
      return 0;
    }

    let best = Infinity;
    const fields = fieldValues(entry);
    const allowContains = queryAnalysis.raw.length >= 2;

    for (const candidate of queryAnalysis.candidates) {
      for (const field of fields) {
        const score = matchScore(field.value, candidate.value, allowContains);

        if (score < Infinity) {
          best = Math.min(best, candidate.baseScore + field.weight + score);
        }
      }
    }

    return best;
  }

  function genderSortWeight(entry) {
    if (entry.linga === "P") return 0;
    if (entry.linga === "S" || entry.linga === "F") return 1;
    if (entry.linga === "N") return 2;
    return 9;
  }

  function slp1SortKey(entry) {
    return String(entry.slp1 || "");
  }

  function searchEntries(entries, query, activeFilterKey) {
    const queryAnalysis = analyzeQuery(query);

    return entries
      .filter(entry => !activeFilterKey || entry.filterKey === activeFilterKey)
      .map(entry => ({
        entry,
        score: queryAnalysis.hasQuery ? scoreEntry(entry, queryAnalysis) : 0
      }))
      .filter(item => !queryAnalysis.hasQuery || item.score < Infinity)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;

        const aLen = (a.entry.slp1 || "").length;
        const bLen = (b.entry.slp1 || "").length;

        if (aLen !== bLen) return aLen - bLen;

        const genderDiff = genderSortWeight(a.entry) - genderSortWeight(b.entry);
        if (genderDiff !== 0) return genderDiff;

        return slp1SortKey(a.entry).localeCompare(slp1SortKey(b.entry));
      })
      .map(item => item.entry);
  }

  global.ShabdaSearch = {
    searchEntries,
    analyzeQuery,
    scoreEntry
  };
})(window);
