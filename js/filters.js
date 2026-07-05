(function (global) {
  "use strict";

  function filterLabel(filter) {
    return `${filter.endingDeva}-ending · ${filter.gender} · ${filter.count}`;
  }

  function activeFilterLabel(filter) {
    if (!filter) return "No filter selected";
    return `${filter.endingDeva}-ending ${filter.gender} stems — ${filter.count}`;
  }

  function sortFilters(filters) {
    const vowelOrder = ["a", "A", "i", "I", "u", "U", "f", "F", "x", "X", "e", "o", "E", "O"];
    const genderOrder = { P: 1, S: 2, F: 2, N: 3 };

    return [...filters].sort((a, b) => {
      const aV = vowelOrder.indexOf(a.endingSlp1);
      const bV = vowelOrder.indexOf(b.endingSlp1);

      if (a.endingType !== b.endingType) {
        return a.endingType === "vowel" ? -1 : 1;
      }

      if (aV !== bV) return aV - bV;

      return (genderOrder[a.linga] || 9) - (genderOrder[b.linga] || 9);
    });
  }

  global.ShabdaFilters = {
    filterLabel,
    activeFilterLabel,
    sortFilters
  };
})(window);
