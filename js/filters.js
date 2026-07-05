(function (global) {
  "use strict";

  function getEndingKey(filter) {
    return `${filter.endingType}:${filter.endingSlp1}`;
  }

  function getEndingLabel(filter) {
    return `${filter.endingDeva} · ${filter.endingIast}`;
  }

  function getGenderLabel(filter) {
    return `${filter.gender} · ${filter.count}`;
  }

  function activeFilterLabel(filter, endingFilter) {
    if (filter) {
      return `${filter.endingDeva}-ending ${filter.gender} stems — ${filter.count}`;
    }

    if (endingFilter) {
      return `${endingFilter.endingDeva}-ending stems selected. Choose gender.`;
    }

    return "No filter selected";
  }

  function sortFilters(filters) {
    const vowelOrder = ["a", "A", "i", "I", "u", "U", "f", "F", "x", "X", "e", "E", "o", "O"];
    const genderOrder = { P: 1, S: 2, F: 2, N: 3 };

    return [...filters].sort((a, b) => {
      if (a.endingType !== b.endingType) {
        return a.endingType === "vowel" ? -1 : 1;
      }

      if (a.endingType === "vowel") {
        const aV = vowelOrder.indexOf(a.endingSlp1);
        const bV = vowelOrder.indexOf(b.endingSlp1);

        if (aV !== bV) return aV - bV;
      } else {
        const endingCompare = (a.endingSlp1 || "").localeCompare(b.endingSlp1 || "");
        if (endingCompare !== 0) return endingCompare;
      }

      return (genderOrder[a.linga] || 9) - (genderOrder[b.linga] || 9);
    });
  }

  function getEndingGroups(filters) {
    const map = new Map();

    for (const filter of filters) {
      const key = getEndingKey(filter);

      if (!map.has(key)) {
        map.set(key, {
          key,
          endingType: filter.endingType,
          endingSlp1: filter.endingSlp1,
          endingDeva: filter.endingDeva,
          endingIast: filter.endingIast,
          count: 0,
          filters: []
        });
      }

      const group = map.get(key);
      group.count += filter.count;
      group.filters.push(filter);
    }

    return Array.from(map.values());
  }

  function getFiltersForEnding(filters, endingKey) {
    return filters.filter(filter => getEndingKey(filter) === endingKey);
  }

  global.ShabdaFilters = {
    getEndingKey,
    getEndingLabel,
    getGenderLabel,
    activeFilterLabel,
    sortFilters,
    getEndingGroups,
    getFiltersForEnding
  };
})(window);
