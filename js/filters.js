(function (global) {
  "use strict";

  const VOWEL_ORDER = ["a", "A", "i", "I", "u", "U", "f", "F", "x", "X", "e", "E", "o", "O"];

  const GENDER_ORDER = {
    P: 1,
    S: 2,
    F: 2,
    N: 3
  };

  const CONSONANT_SECTIONS = [
    {
      key: "velars",
      title: "Velars",
      deva: "क-वर्ग",
      slp1s: ["k", "K", "g", "G", "N"]
    },
    {
      key: "palatals",
      title: "Palatals",
      deva: "च-वर्ग",
      slp1s: ["c", "C", "j", "J", "Y"]
    },
    {
      key: "retroflexes",
      title: "Retroflexes",
      deva: "ट-वर्ग",
      slp1s: ["w", "W", "q", "Q", "R"]
    },
    {
      key: "dentals",
      title: "Dentals",
      deva: "त-वर्ग",
      slp1s: ["t", "T", "d", "D", "n"]
    },
    {
      key: "labials",
      title: "Labials",
      deva: "प-वर्ग",
      slp1s: ["p", "P", "b", "B", "m"]
    },
    {
      key: "semivowels",
      title: "Semivowels",
      deva: "अन्तःस्थ",
      slp1s: ["y", "r", "l", "v", "L"]
    },
    {
      key: "sibilants-h",
      title: "Sibilants and h",
      deva: "ऊष्म",
      slp1s: ["S", "z", "s", "h"]
    }
  ];

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

  function consonantSectionIndex(slp1) {
    const index = CONSONANT_SECTIONS.findIndex(section =>
      section.slp1s.includes(slp1)
    );

    return index === -1 ? 999 : index;
  }

  function consonantSoundIndex(slp1) {
    const section = CONSONANT_SECTIONS.find(section =>
      section.slp1s.includes(slp1)
    );

    if (!section) return 999;

    return section.slp1s.indexOf(slp1);
  }

  function endingSortWeight(filter) {
    if (filter.endingType === "vowel") {
      const index = VOWEL_ORDER.indexOf(filter.endingSlp1);
      return index === -1 ? 999 : index;
    }

    return 1000 +
      consonantSectionIndex(filter.endingSlp1) * 10 +
      consonantSoundIndex(filter.endingSlp1);
  }

  function sortFilters(filters) {
    return [...filters].sort((a, b) => {
      const endingDiff = endingSortWeight(a) - endingSortWeight(b);
      if (endingDiff !== 0) return endingDiff;

      return (GENDER_ORDER[a.linga] || 9) - (GENDER_ORDER[b.linga] || 9);
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

    return Array.from(map.values()).sort((a, b) => {
      return endingSortWeight(a) - endingSortWeight(b);
    });
  }

  function getFiltersForEnding(filters, endingKey) {
    return filters.filter(filter => getEndingKey(filter) === endingKey);
  }

  function getEndingSections(filters) {
    const endingGroups = getEndingGroups(filters);

    const sections = [];

    const vowelGroups = endingGroups.filter(group => group.endingType === "vowel");

    if (vowelGroups.length) {
      sections.push({
        key: "vowels",
        title: "Vowel endings",
        deva: "स्वरान्त",
        groups: vowelGroups
      });
    }

    for (const consonantSection of CONSONANT_SECTIONS) {
      const groups = endingGroups.filter(group =>
        group.endingType === "consonant" &&
        consonantSection.slp1s.includes(group.endingSlp1)
      );

      if (groups.length) {
        sections.push({
          key: consonantSection.key,
          title: consonantSection.title,
          deva: consonantSection.deva,
          groups
        });
      }
    }

    const otherConsonants = endingGroups.filter(group =>
      group.endingType === "consonant" &&
      consonantSectionIndex(group.endingSlp1) === 999
    );

    if (otherConsonants.length) {
      sections.push({
        key: "other-consonants",
        title: "Other consonants",
        deva: "अन्यहलन्त",
        groups: otherConsonants
      });
    }

    return sections;
  }

  global.ShabdaFilters = {
    getEndingKey,
    getEndingLabel,
    getGenderLabel,
    activeFilterLabel,
    sortFilters,
    getEndingGroups,
    getFiltersForEnding,
    getEndingSections
  };
})(window);
