(function () {
  "use strict";

  const state = window.ShabdaState;
  const RECENT_STORAGE_KEY = "shabdrupani.recentIds";
  const RECENT_LIMIT = 8;

  const els = {
    searchInput: document.getElementById("searchInput"),
    totalCount: document.getElementById("totalCount"),
    matchCount: document.getElementById("matchCount"),
    filterGrid: document.getElementById("filterGrid"),
    activeFilterLabel: document.getElementById("activeFilterLabel"),
    clearFilterBtn: document.getElementById("clearFilterBtn"),
    resultsHint: document.getElementById("resultsHint"),
    resultsList: document.getElementById("resultsList"),
    recentPanel: document.getElementById("recentPanel"),
    recentList: document.getElementById("recentList"),
    clearRecentBtn: document.getElementById("clearRecentBtn"),
    tableOutput: document.getElementById("tableOutput"),
    prakriyaPanel: document.getElementById("prakriyaPanel"),
    copyTableBtn: document.getElementById("copyTableBtn"),
    printTableBtn: document.getElementById("printTableBtn")
  };

  async function loadJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ${url}`);
    }

    return response.json();
  }

  async function init() {
    try {
      const [index, filters, prakriyaLookup, sutraTexts] = await Promise.all([
          loadJson("data/generated/shabda-index.json"),
          loadJson("data/generated/filter-counts.json"),
          loadJson("data/generated/prakriya-lookup.json"),
          loadJson("data/generated/sutra-texts.json")
        ]);

      state.index = index;
      state.filters = ShabdaFilters.sortFilters(filters);
      state.prakriyaLookup = prakriyaLookup;
      state.sutraTexts = sutraTexts;
      state.recentIds = loadRecentIds().filter(id =>
        state.index.some(entry => entry.id === id)
      );

      els.totalCount.textContent = `${state.index.length} stems available`;

      renderFilters();
      renderRecent();
      updateResults();
      bindEvents();
    } catch (error) {
      console.error(error);
      els.totalCount.textContent = "Database failed to load.";
      els.resultsHint.textContent = error.message;
    }
  }

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim();
    updateResults();
  });

  els.clearFilterBtn.addEventListener("click", () => {
    state.activeEndingKey = null;
    state.activeFilterKey = null;
    renderFilters();
    updateResults();
  });

  els.clearRecentBtn.addEventListener("click", () => {
    state.recentIds = [];
    saveRecentIds();
    renderRecent();
  });

  els.printTableBtn.addEventListener("click", () => {
    if (!state.selectedId) {
      alert("Please select a stem before printing.");
      return;
    }

    window.print();
  });

els.copyTableBtn.addEventListener("click", () => {
  console.log("Copy table clicked.");

  if (!state.selectedId || !state.selectedEntry) {
    alert("Please select a stem before copying.");
    return;
  }

  try {
    const text = ShabdaTableRenderer.buildCopyText(
      state.selectedEntry,
      state.displayMode
    );

    copyTextToClipboard(text);

    const oldText = els.copyTableBtn.textContent;
    els.copyTableBtn.textContent = "Copied!";

    setTimeout(() => {
      els.copyTableBtn.textContent = oldText;
    }, 1200);
  } catch (error) {
    console.error(error);
    alert("Could not copy this table.");
  }
}); 
 document.querySelectorAll("[data-display-mode]").forEach(button => {
    button.addEventListener("click", () => {
      state.displayMode = button.dataset.displayMode;

      document.querySelectorAll("[data-display-mode]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.displayMode === state.displayMode);
      });

      if (state.selectedId) {
        loadTableEntry(state.selectedId).then(entry => {
          els.tableOutput.innerHTML = ShabdaTableRenderer.renderTable(
            entry,
            state.displayMode
          );
        }).catch(error => {
          console.error(error);
          els.tableOutput.innerHTML = `
            <div class="empty-table">Could not reload this declension table.</div>
          `;
        });
      }
    });
  });
}  
  function loadRecentIds() {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecentIds() {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(state.recentIds));
  }

  function addRecentId(id) {
    state.recentIds = [
      id,
      ...state.recentIds.filter(existingId => existingId !== id)
    ].slice(0, RECENT_LIMIT);

    saveRecentIds();
    renderRecent();
  }

  function getIndexEntryById(id) {
    return state.index.find(entry => entry.id === id);
  }

  async function loadTableEntry(id) {
    const indexEntry = getIndexEntryById(id);

    if (!indexEntry) {
      throw new Error(`No index entry found for ${id}`);
    }

    const tableFile = indexEntry.tableFile;

    if (!tableFile) {
      throw new Error(`No table file recorded for ${id}`);
    }

    if (!state.tableCache[tableFile]) {
      state.tableCache[tableFile] = await loadJson(`data/generated/${tableFile}`);
    }

    const tableEntry = state.tableCache[tableFile][id];

    if (!tableEntry) {
      throw new Error(`Table entry ${id} not found in ${tableFile}`);
    }

    return tableEntry;
  }

  function renderRecent() {
    if (!state.recentIds.length) {
      els.recentPanel.classList.add("hidden");
      els.recentList.innerHTML = "";
      return;
    }

    els.recentPanel.classList.remove("hidden");

    els.recentList.innerHTML = state.recentIds.map(id => {
      const entry = getIndexEntryById(id);
      if (!entry) return "";

      const activeClass = id === state.selectedId ? " active" : "";

      return `
        <button type="button" class="recent-chip${activeClass}" data-recent-id="${id}">
          <span class="recent-deva">${entry.deva}</span>
          <span class="recent-iast">${entry.iast}</span>
        </button>
      `;
    }).join("");

    els.recentList.querySelectorAll("[data-recent-id]").forEach(button => {
      button.addEventListener("click", () => {
        selectEntry(button.dataset.recentId);
      });
    });
  }

  function renderFilters() {
  const activeFullFilter = state.filters.find(f => f.key === state.activeFilterKey);
  const endingGroups = ShabdaFilters.getEndingGroups(state.filters);
  const endingSections = ShabdaFilters.getEndingSections(state.filters);
  const activeEndingGroup = endingGroups.find(g => g.key === state.activeEndingKey);

  els.activeFilterLabel.textContent = ShabdaFilters.activeFilterLabel(
    activeFullFilter,
    activeEndingGroup
  );

  const endingSectionsHtml = endingSections.map(section => {
    const buttons = section.groups.map(group => {
      const activeClass = group.key === state.activeEndingKey ? " active" : "";

      return `
        <button
          type="button"
          class="filter-chip ending-chip${activeClass}"
          data-ending-key="${group.key}"
          title="${group.count} stems"
        >
          <span class="chip-deva">${group.endingDeva}</span>
          <span class="chip-count">${group.count}</span>
        </button>
      `;
    }).join("");

    return `
      <div class="ending-section">
        <div class="ending-section-title">
          <span>${section.title}</span>
          <span class="ending-section-deva">${section.deva}</span>
        </div>

        <div class="ending-filter-grid">
          ${buttons}
        </div>
      </div>
    `;
  }).join("");

  let genderButtons = "";

  if (state.activeEndingKey) {
    const genderFilters = ShabdaFilters.getFiltersForEnding(
      state.filters,
      state.activeEndingKey
    );

    genderButtons = `
      <div class="filter-subtitle">Choose gender</div>
      <div class="gender-filter-grid">
        ${genderFilters.map(filter => {
          const activeClass = filter.key === state.activeFilterKey ? " active" : "";

          return `
            <button
              type="button"
              class="filter-chip gender-chip${activeClass}"
              data-filter-key="${filter.key}"
            >
              ${filter.gender} · ${filter.count}
            </button>
          `;
        }).join("")}
      </div>
    `;
  } else {
    genderButtons = `
      <div class="filter-subtitle muted">
        Select an ending first.
      </div>
    `;
  }

  els.filterGrid.innerHTML = `
    <div class="filter-subtitle">Choose ending</div>
    ${endingSectionsHtml}
    ${genderButtons}
  `;

  els.filterGrid.querySelectorAll("[data-ending-key]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeEndingKey = button.dataset.endingKey;
      state.activeFilterKey = null;
      renderFilters();
      updateResults();
    });
  });

  els.filterGrid.querySelectorAll("[data-filter-key]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeFilterKey = button.dataset.filterKey;
      renderFilters();
      updateResults();
    });
  });
}
  function getCurrentMatches() {
    const effectiveFilterKey = state.activeFilterKey;

    let matches = ShabdaSearch.searchEntries(
      state.index,
      state.query,
      effectiveFilterKey
    );

    if (!effectiveFilterKey && state.activeEndingKey) {
      matches = matches.filter(entry => {
        const endingKey = `${entry.endingType}:${entry.endingSlp1}`;
        return endingKey === state.activeEndingKey;
      });
    }

    return matches;
  }

  function updateResults() {
    const matches = getCurrentMatches();

    els.matchCount.textContent = `${matches.length} matches`;

    if (!state.query && !state.activeEndingKey && !state.activeFilterKey) {
      els.resultsHint.textContent = "Type a search term or choose a filter.";
      els.resultsList.innerHTML = "";
      return;
    }

    if (matches.length === 0) {
      els.resultsHint.textContent = "No matching stems found.";
      els.resultsList.innerHTML = "";
      return;
    }

    if (matches.length > 80) {
      els.resultsHint.textContent = `${matches.length} matches. Refine the search or choose gender. Showing first 80.`;
    } else if (matches.length > 12) {
      els.resultsHint.textContent = `${matches.length} matches. Showing all matches.`;
    } else {
      els.resultsHint.textContent = `${matches.length} matches. Select a stem.`;
    }

    renderResults(matches.slice(0, 80));
  }

  function renderResults(matches) {
    els.resultsList.innerHTML = matches.map(entry => {
      const activeClass = entry.id === state.selectedId ? " selected" : "";

      return `
        <button type="button" class="result-item${activeClass}" data-entry-id="${entry.id}">
          <div class="result-main">
            <span class="result-deva">${entry.deva}</span>
            <span class="result-iast">${entry.iast}</span>
            <span class="result-iast">${entry.slp1}</span>
          </div>
          <div class="result-meta">
            ${entry.gender} · ${entry.endingDeva}-ending · ${entry.meaning || entry.artha || ""}
          </div>
        </button>
      `;
    }).join("");

    els.resultsList.querySelectorAll("[data-entry-id]").forEach(button => {
      button.addEventListener("click", () => {
        selectEntry(button.dataset.entryId);
      });
    });
  }
    
  function copyTextToClipboard(text) {
  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const ok = document.execCommand("copy");

  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error("Fallback copy failed.");
  }
}  

  function renderSelectedTable(entry) {
  els.tableOutput.innerHTML = ShabdaTableRenderer.renderTable(
    entry,
    state.displayMode,
    {
      prakriyaLookup: state.prakriyaLookup
    }
  );

  bindPrakriyaButtons();
}

function clearPrakriyaPanel() {
  els.prakriyaPanel.className = "prakriya-panel empty-prakriya";
  els.prakriyaPanel.innerHTML = "Select a highlighted form to view its derivation.";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSutraChip(sutraCode) {
  const sutra = state.sutraTexts[sutraCode];

  if (!sutra) {
    return `
      <span class="sutra-chip sutra-chip-missing">
        ${escapeHtml(sutraCode)}
      </span>
    `;
  }

  return `
    <span class="sutra-chip sutra-chip-rich" title="${escapeHtml(sutra.iast)} · ${escapeHtml(sutra.slp1)}">
      <span class="sutra-code">${escapeHtml(sutra.code)}</span>
      <span class="sutra-deva">${escapeHtml(sutra.deva)}</span>
    </span>
  `;
}

function renderPrakriyaEntries(entries) {
  if (!entries.length) {
    els.prakriyaPanel.className = "prakriya-panel empty-prakriya";
    els.prakriyaPanel.innerHTML = "No derivation steps found for this form.";
    return;
  }

  els.prakriyaPanel.className = "prakriya-panel";

  els.prakriyaPanel.innerHTML = entries.map((entry, entryIndex) => {
    const stepsHtml = entry.steps.length
      ? entry.steps.map(step => `
          <div class="prakriya-step">
            <div class="prakriya-step-number">${step.index}</div>
            <div class="prakriya-step-body">
              <div class="prakriya-step-deva">${escapeHtml(step.deva)}</div>
              <div class="prakriya-step-iast">${escapeHtml(step.iast)}</div>
              <div class="prakriya-sutras">
                ${step.sutras.map(sutra => renderSutraChip(sutra)).join("")}
              </div>
            </div>
          </div>
        `).join("")
      : `<div class="empty-prakriya">Derivation entry exists, but no steps are available.</div>`;

    const multipleLabel = entries.length > 1
      ? `<span class="prakriya-alt-label">Derivation ${entryIndex + 1} of ${entries.length}</span>`
      : "";

    return `
      <section class="prakriya-entry">
        <div class="prakriya-heading">
          <div>
            <div class="prakriya-title">
              ${escapeHtml(entry.word.deva)} → ${escapeHtml(entry.form.deva)}
            </div>
            <div class="prakriya-subtitle">
              ${escapeHtml(entry.word.iast)} → ${escapeHtml(entry.form.iast)}
            </div>
          </div>
          ${multipleLabel}
        </div>

        <div class="prakriya-steps">
          ${stepsHtml}
        </div>
      </section>
    `;
  }).join("");
}

function bindPrakriyaButtons() {
  els.tableOutput.querySelectorAll("[data-prakriya-key]").forEach(button => {
    button.addEventListener("click", async () => {
      const key = button.dataset.prakriyaKey;

      els.tableOutput.querySelectorAll(".form-button.active").forEach(activeButton => {
        activeButton.classList.remove("active");
      });

      button.classList.add("active");

      els.prakriyaPanel.className = "prakriya-panel empty-prakriya";
      els.prakriyaPanel.innerHTML = "Loading derivation...";

      try {
        const entries = await ShabdaPrakriya.loadEntriesForKey(
          key,
          state.prakriyaLookup,
          state.prakriyaChunkCache
        );

        renderPrakriyaEntries(entries);
      } catch (error) {
        console.error(error);
        els.prakriyaPanel.className = "prakriya-panel empty-prakriya";
        els.prakriyaPanel.innerHTML = "Could not load derivation data.";
      }
    });
  });
}

  async function selectEntry(id) {
    state.selectedId = id;

    els.tableOutput.innerHTML = `
      <div class="empty-table">Loading declension table...</div>
    `;

    try {
      const entry = await loadTableEntry(id);
        state.selectedEntry = entry;

       renderSelectedTable(entry);
       clearPrakriyaPanel();

      addRecentId(id);
      renderRecent();
      updateResults();

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
      });
    } catch (error) {
      console.error(error);
      els.tableOutput.innerHTML = `
        <div class="empty-table">Could not load this declension table.</div>
      `;
    }
  }

  init();
})();
