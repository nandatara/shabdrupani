(function () {
  "use strict";

  const state = window.ShabdaState;

  const els = {
    searchInput: document.getElementById("searchInput"),
    totalCount: document.getElementById("totalCount"),
    matchCount: document.getElementById("matchCount"),
    filterGrid: document.getElementById("filterGrid"),
    activeFilterLabel: document.getElementById("activeFilterLabel"),
    clearFilterBtn: document.getElementById("clearFilterBtn"),
    resultsHint: document.getElementById("resultsHint"),
    resultsList: document.getElementById("resultsList"),
    tableOutput: document.getElementById("tableOutput")
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
      const [index, tables, filters] = await Promise.all([
        loadJson("data/generated/shabda-index.json"),
        loadJson("data/generated/shabda-tables.json"),
        loadJson("data/generated/filter-counts.json")
      ]);

      state.index = index;
      state.tables = tables;
      state.filters = ShabdaFilters.sortFilters(filters);

      els.totalCount.textContent = `${state.index.length} stems available`;

      renderFilters();
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
      state.activeFilterKey = null;
      renderFilters();
      updateResults();
    });
  }

  function renderFilters() {
    const activeFilter = state.filters.find(f => f.key === state.activeFilterKey);
    els.activeFilterLabel.textContent = ShabdaFilters.activeFilterLabel(activeFilter);

    els.filterGrid.innerHTML = state.filters.map(filter => {
      const activeClass = filter.key === state.activeFilterKey ? " active" : "";

      return `
        <button
          type="button"
          class="filter-chip${activeClass}"
          data-filter-key="${filter.key}"
        >
          ${filter.endingDeva} · ${filter.gender} · ${filter.count}
        </button>
      `;
    }).join("");

    els.filterGrid.querySelectorAll("[data-filter-key]").forEach(button => {
      button.addEventListener("click", () => {
        state.activeFilterKey = button.dataset.filterKey;
        renderFilters();
        updateResults();
      });
    });
  }

  function updateResults() {
    const matches = ShabdaSearch.searchEntries(
      state.index,
      state.query,
      state.activeFilterKey
    );

    els.matchCount.textContent = `${matches.length} matches`;

    if (!state.query && !state.activeFilterKey) {
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
      els.resultsHint.textContent = `${matches.length} matches. Refine the search or add a filter. Showing first 80.`;
    } else if (matches.length > 12) {
      els.resultsHint.textContent = `${matches.length} matches. Showing all matches.`;
    } else {
      els.resultsHint.textContent = `${matches.length} matches. Select a stem.`;
    }

    renderResults(matches.slice(0, 80));
  }

  function renderResults(matches) {
    els.resultsList.innerHTML = matches.map(entry => `
      <button type="button" class="result-item" data-entry-id="${entry.id}">
        <div class="result-main">
          <span class="result-deva">${entry.deva}</span>
          <span class="result-iast">${entry.iast}</span>
          <span class="result-iast">${entry.slp1}</span>
        </div>
        <div class="result-meta">
          ${entry.gender} · ${entry.endingDeva}-ending · ${entry.meaning || entry.artha || ""}
        </div>
      </button>
    `).join("");

    els.resultsList.querySelectorAll("[data-entry-id]").forEach(button => {
      button.addEventListener("click", () => {
        selectEntry(button.dataset.entryId);
      });
    });
  }

  function selectEntry(id) {
    state.selectedId = id;
    const entry = state.tables[id];

    els.tableOutput.innerHTML = ShabdaTableRenderer.renderTable(entry);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  }

  init();
})();
