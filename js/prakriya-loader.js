(function (global) {
  "use strict";

  const VACANA_TO_NUMBER = {
    sg: "1",
    du: "2",
    pl: "3"
  };

  function normalizeBaseIndex(baseindex) {
    const raw = String(baseindex || "").trim();
    const match = raw.match(/^0*(\d+)\.0*(\d+)$/);

    if (!match) {
      return raw;
    }

    return `${Number(match[1])}.${Number(match[2])}`;
  }

  function makePrakriyaKey(baseindex, vibhakti, vacanaKey, formSlp1) {
    const normalizedBase = normalizeBaseIndex(baseindex);
    const vachan = VACANA_TO_NUMBER[vacanaKey] || String(vacanaKey || "").trim();

    return `${normalizedBase}|${vibhakti}|${vachan}|${formSlp1}`;
  }

  function getRefsForForm(lookup, baseindex, vibhakti, vacanaKey, formSlp1) {
    const key = makePrakriyaKey(baseindex, vibhakti, vacanaKey, formSlp1);
    return {
      key,
      refs: lookup[key] || []
    };
  }

  async function loadJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ${url}`);
    }

    return response.json();
  }

  async function loadEntriesForKey(key, lookup, chunkCache) {
    const refs = lookup[key] || [];

    const entries = [];

    for (const ref of refs) {
      if (!chunkCache[ref.chunkFile]) {
        chunkCache[ref.chunkFile] = await loadJson(`data/generated/${ref.chunkFile}`);
      }

      const entry = chunkCache[ref.chunkFile][ref.id];

      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  global.ShabdaPrakriya = {
    makePrakriyaKey,
    getRefsForForm,
    loadEntriesForKey
  };
})(window);
