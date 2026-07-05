(function (global) {
  "use strict";

  function hasDevanagari(text) {
    return /[\u0900-\u097F]/.test(text || "");
  }

  function queryVariants(query) {
    const raw = (query || "").trim();
    const variants = new Set();

    if (!raw) return variants;

    variants.add(raw);
    variants.add(raw.toLowerCase());

    if (hasDevanagari(raw)) {
      const slp1 = Translit.devaToSlp1(raw);
      variants.add(slp1);
      variants.add(slp1.toLowerCase());
      variants.add(Translit.slp1ToIast(slp1));
      variants.add(Translit.stripIastDiacritics(Translit.slp1ToIast(slp1)));
    } else {
      const fromIast = Translit.iastToSlp1(raw);
      variants.add(fromIast);
      variants.add(fromIast.toLowerCase());
      variants.add(Translit.stripIastDiacritics(raw));
    }

    return variants;
  }

  function scoreEntry(entry, variants) {
    if (!variants || variants.size === 0) return 0;

    const fields = [
      entry.deva || "",
      entry.slp1 || "",
      entry.iast || "",
      entry.ascii || ""
    ];

    let best = Infinity;

    for (const q of variants) {
      if (!q) continue;

      for (const field of fields) {
        if (!field) continue;

        const fieldLower = field.toLowerCase();
        const qLower = q.toLowerCase();

        if (field === q) best = Math.min(best, 0);
        else if (fieldLower === qLower) best = Math.min(best, 1);
        else if (field.startsWith(q)) best = Math.min(best, 2);
        else if (fieldLower.startsWith(qLower)) best = Math.min(best, 3);
        else if (fieldLower.includes(qLower)) best = Math.min(best, 8);
      }
    }

    return best;
  }

  function searchEntries(entries, query, activeFilterKey) {
    const variants = queryVariants(query);
    const hasQuery = variants.size > 0;

    return entries
      .filter(entry => !activeFilterKey || entry.filterKey === activeFilterKey)
      .map(entry => ({
        entry,
        score: hasQuery ? scoreEntry(entry, variants) : 0
      }))
      .filter(item => !hasQuery || item.score < Infinity)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return (a.entry.slp1 || "").localeCompare(b.entry.slp1 || "");
      })
      .map(item => item.entry);
  }

  global.ShabdaSearch = {
    searchEntries
  };
})(window);
