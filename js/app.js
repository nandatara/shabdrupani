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
  state.selectedPrakriyaEntries = [];
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
      <button
        type="button"
        class="sutra-chip sutra-chip-missing"
        data-sutra-code="${escapeHtml(sutraCode)}"
      >
        ${escapeHtml(sutraCode)}
      </button>
    `;
  }

  return `
    <button
      type="button"
      class="sutra-chip sutra-chip-rich"
      data-sutra-code="${escapeHtml(sutra.code)}"
      title="${escapeHtml(sutra.iast)} · ${escapeHtml(sutra.slp1)}"
    >
      <span class="sutra-code">${escapeHtml(sutra.code)}</span>
      <span class="sutra-deva">${escapeHtml(sutra.deva)}</span>
    </button>
  `;
}

function renderSutraDetail(sutraCode) {
  const panel = document.getElementById("sutraDetailPanel");

  if (!panel) return;

  const sutra = state.sutraTexts[sutraCode];

  if (!sutra) {
    panel.className = "sutra-detail-panel";
    panel.innerHTML = `
      <div class="sutra-detail-title">Sūtra not found</div>
      <div class="sutra-detail-row">
        <span>Code</span>
        <strong>${escapeHtml(sutraCode)}</strong>
      </div>
      <div class="muted">
        This sūtra number is present in the prakriyā data but missing from the sūtra text file.
      </div>
    `;
    return;
  }

  panel.className = "sutra-detail-panel";
  panel.innerHTML = `
    <div class="sutra-detail-title">Sūtra Detail</div>

    <div class="sutra-detail-main">
      <div class="sutra-detail-code">${escapeHtml(sutra.code)}</div>
      <div class="sutra-detail-deva">${escapeHtml(sutra.deva)}</div>
    </div>

    <div class="sutra-detail-grid">
      <div class="sutra-detail-row">
        <span>IAST</span>
        <strong>${escapeHtml(sutra.iast)}</strong>
      </div>

      <div class="sutra-detail-row">
        <span>SLP1</span>
        <code>${escapeHtml(sutra.slp1)}</code>
      </div>
    </div>
  `;
}

function bindSutraChipButtons() {
  els.prakriyaPanel.querySelectorAll("[data-sutra-code]").forEach(button => {
    button.addEventListener("click", () => {
      const sutraCode = button.dataset.sutraCode;

      els.prakriyaPanel.querySelectorAll(".sutra-chip.active").forEach(activeChip => {
        activeChip.classList.remove("active");
      });

      button.classList.add("active");
      renderSutraDetail(sutraCode);
    });
  });
}

function bindCopyPrakriyaButton() {
  const button = document.getElementById("copyPrakriyaBtn");

  if (!button) return;

  button.addEventListener("click", () => {
    if (!state.selectedPrakriyaEntries.length) {
      alert("No derivation is currently selected.");
      return;
    }

    try {
      const text = buildPrakriyaCopyText(state.selectedPrakriyaEntries);
      copyTextToClipboard(text);

      const oldText = button.textContent;
      button.textContent = "Copied!";

      setTimeout(() => {
        button.textContent = oldText;
      }, 1200);
    } catch (error) {
      console.error(error);
      alert("Could not copy this derivation.");
    }
  });
}

function bindPrintPrakriyaButton() {
  const button = document.getElementById("printPrakriyaBtn");

  if (!button) return;

  button.addEventListener("click", () => {
    if (!state.selectedPrakriyaEntries.length) {
      alert("No derivation is currently selected.");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Could not open the print window. Please allow popups for this site.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrakriyaPrintHtml(state.selectedPrakriyaEntries));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  });
}

function sutraForCopy(sutraCode) {
  const sutra = state.sutraTexts[sutraCode];

  if (!sutra) {
    return sutraCode;
  }

  return `${sutra.code} ${sutra.deva} (${sutra.iast}; ${sutra.slp1})`;
}

function buildPrakriyaCopyText(entries) {
  if (!entries || !entries.length) {
    return "";
  }

  const lines = [];

  lines.push("Shabdrupāṇi — Derivation");
  lines.push("");

  entries.forEach((entry, entryIndex) => {
    if (entries.length > 1) {
      lines.push(`Derivation ${entryIndex + 1} of ${entries.length}`);
    }

    lines.push(`Word\t${entry.word.deva}`);
    lines.push(`Form\t${entry.form.deva}`);
    lines.push(`IAST\t${entry.word.iast} → ${entry.form.iast}`);
    lines.push(`SLP1\t${entry.word.slp1} → ${entry.form.slp1}`);
    lines.push(`Base index\t${entry.baseindex?.raw || entry.baseindex?.normalized || ""}`);
    lines.push(`Vibhakti\t${entry.vibhakti}`);
    lines.push(`Vachana\t${entry.vachan}`);
    lines.push("");

    if (!entry.steps || !entry.steps.length) {
      lines.push("Derivation entry exists, but no steps are available.");
      lines.push("");
      return;
    }

    entry.steps.forEach(step => {
      lines.push(`${step.index}. ${step.deva}`);
      lines.push(`   IAST: ${step.iast}`);

      if (step.sutras && step.sutras.length) {
        lines.push("   Sūtras:");
        step.sutras.forEach(sutraCode => {
          lines.push(`   - ${sutraForCopy(sutraCode)}`);
        });
      }

      lines.push("");
    });
  });

  lines.push("Generated from Shabdrupāṇi");

  return lines.join("\n");
}

function buildPrakriyaPrintHtml(entries) {
  const today = new Date().toLocaleString();

  const entriesHtml = entries.map((entry, entryIndex) => {
    const derivationHeading = entries.length > 1
      ? `<div class="alt-heading">Derivation ${entryIndex + 1} of ${entries.length}</div>`
      : "";

    const stepsHtml = entry.steps && entry.steps.length
      ? entry.steps.map(step => {
          const sutrasHtml = step.sutras && step.sutras.length
            ? `
              <ul class="sutra-list">
                ${step.sutras.map(sutraCode => {
                  const sutra = state.sutraTexts[sutraCode];

                  if (!sutra) {
                    return `<li><strong>${escapeHtml(sutraCode)}</strong></li>`;
                  }

                  return `
                    <li>
                      <strong>${escapeHtml(sutra.code)}</strong>
                      <span class="sutra-deva">${escapeHtml(sutra.deva)}</span>
                      <span class="sutra-iast">${escapeHtml(sutra.iast)}</span>
                      <code>${escapeHtml(sutra.slp1)}</code>
                    </li>
                  `;
                }).join("")}
              </ul>
            `
            : "";

          return `
            <div class="step">
              <div class="step-number">${escapeHtml(step.index)}</div>
              <div class="step-body">
                <div class="step-deva">${escapeHtml(step.deva)}</div>
                <div class="step-iast">${escapeHtml(step.iast)}</div>
                ${sutrasHtml}
              </div>
            </div>
          `;
        }).join("")
      : `<div class="empty-note">Derivation entry exists, but no steps are available.</div>`;

    return `
      <section class="entry">
        ${derivationHeading}

        <div class="entry-title">
          <span>${escapeHtml(entry.word.deva)}</span>
          <span class="arrow">→</span>
          <span>${escapeHtml(entry.form.deva)}</span>
        </div>

        <div class="entry-subtitle">
          ${escapeHtml(entry.word.iast)} → ${escapeHtml(entry.form.iast)}
        </div>

        <div class="meta">
          <div><strong>Base index:</strong> ${escapeHtml(entry.baseindex?.raw || entry.baseindex?.normalized || "")}</div>
          <div><strong>Vibhakti:</strong> ${escapeHtml(entry.vibhakti)}</div>
          <div><strong>Vachana:</strong> ${escapeHtml(entry.vachan)}</div>
        </div>

        ${stepsHtml}
      </section>
    `;
  }).join("");

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Shabdrupāṇi Derivation</title>
  <style>
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #1F2933;
      background: white;
      margin: 32px;
      line-height: 1.45;
    }

    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #1E3A5F;
      border-bottom: 2px solid #D8CBB4;
      padding-bottom: 8px;
      margin-bottom: 6px;
    }

    .generated {
      color: #64748B;
      font-size: 12px;
      margin-bottom: 24px;
    }

    .entry {
      page-break-inside: avoid;
      margin-bottom: 28px;
    }

    .alt-heading {
      font-size: 13px;
      font-weight: 800;
      color: #B7791F;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    .entry-title {
      font-family: "Noto Serif Devanagari", "Mangal", serif;
      font-size: 28px;
      font-weight: 900;
      color: #1E3A5F;
      margin-bottom: 2px;
    }

    .arrow {
      margin: 0 8px;
      color: #B7791F;
    }

    .entry-subtitle {
      color: #64748B;
      margin-bottom: 10px;
    }

    .meta {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #374151;
      border: 1px solid #D8CBB4;
      padding: 8px 10px;
      margin-bottom: 14px;
    }

    .step {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 10px;
      border-top: 1px solid #E4D8C5;
      padding: 10px 0;
      page-break-inside: avoid;
    }

    .step-number {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: #1E3A5F;
      color: white;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }

    .step-deva {
      font-family: "Noto Serif Devanagari", "Mangal", serif;
      font-size: 21px;
      font-weight: 700;
    }

    .step-iast {
      color: #64748B;
      font-size: 14px;
      margin-top: 2px;
    }

    .sutra-list {
      margin: 7px 0 0 0;
      padding-left: 18px;
      font-size: 13px;
    }

    .sutra-list li {
      margin: 3px 0;
    }

    .sutra-deva {
      font-family: "Noto Serif Devanagari", "Mangal", serif;
      margin-left: 6px;
      font-weight: 700;
    }

    .sutra-iast {
      margin-left: 6px;
      color: #64748B;
    }

    code {
      margin-left: 6px;
      font-family: Consolas, "Courier New", monospace;
      color: #1E3A5F;
    }

    .empty-note {
      color: #64748B;
      border: 1px dashed #D8CBB4;
      padding: 12px;
    }

    @page {
      margin: 0.65in;
    }
  </style>
</head>
<body>
  <div class="page-title">Shabdrupāṇi — Derivation</div>
  <div class="generated">Generated ${escapeHtml(today)}</div>

  ${entriesHtml}
</body>
</html>
  `;
}

function renderPrakriyaEntries(entries) {
  state.selectedPrakriyaEntries = entries;

  if (!entries.length) {
    els.prakriyaPanel.className = "prakriya-panel empty-prakriya";
    els.prakriyaPanel.innerHTML = "No derivation steps found for this form.";
    return;
  }

  els.prakriyaPanel.className = "prakriya-panel";

  const entriesHtml = entries.map((entry, entryIndex) => {
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

  els.prakriyaPanel.innerHTML = `
    <div class="prakriya-toolbar">
      <div>
        <div class="prakriya-toolbar-title">Derivation</div>
        <div class="prakriya-toolbar-subtitle">
          ${entries.length > 1 ? `${entries.length} derivations available` : "1 derivation available"}
        </div>
      </div>

      <div class="prakriya-toolbar-actions">
      <button id="copyPrakriyaBtn" class="copy-button" type="button">
        Copy derivation
      </button>

      <button id="printPrakriyaBtn" class="copy-button secondary-copy-button" type="button">
        Print derivation
      </button>
</div>
    </div>

    ${entriesHtml}

    <div id="sutraDetailPanel" class="sutra-detail-panel empty-sutra-detail">
      Click a sūtra chip to view its full details.
    </div>
  `;

  bindSutraChipButtons();
  bindCopyPrakriyaButton();
  bindPrintPrakriyaButton();
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
