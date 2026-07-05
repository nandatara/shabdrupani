(function (global) {
  "use strict";

  const CASES = [
    ["1", "प्रथमा", "prathamā"],
    ["2", "द्वितीया", "dvitīyā"],
    ["3", "तृतीया", "tṛtīyā"],
    ["4", "चतुर्थी", "caturthī"],
    ["5", "पञ्चमी", "pañcamī"],
    ["6", "षष्ठी", "ṣaṣṭhī"],
    ["7", "सप्तमी", "saptamī"],
    ["8", "सम्बोधन", "sambodhana"]
  ];

  const NUMBERS = [
    ["sg", "एकवचन", "Singular"],
    ["du", "द्विवचन", "Dual"],
    ["pl", "बहुवचन", "Plural"]
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function hasText(value) {
    return String(value || "").trim().length > 0;
  }

  function renderOneForm(form, displayMode) {
    if (displayMode === "deva") {
      return `<span class="form-deva">${escapeHtml(form.deva)}</span>`;
    }

    if (displayMode === "iast") {
      return `<span class="form-iast-only">${escapeHtml(form.iast)}</span>`;
    }

    if (displayMode === "slp1") {
      return `<span class="form-slp1">${escapeHtml(form.slp1)}</span>`;
    }

    return `
      <span class="form-deva">${escapeHtml(form.deva)}</span>
      <span class="form-iast">${escapeHtml(form.iast)}</span>
    `;
  }

  function renderFormCell(forms, displayMode) {
    if (!forms || forms.length === 0) {
      return `<span class="muted">—</span>`;
    }

    return forms.map((form, index) => {
      const sep = index > 0 ? `<span class="alt-separator">/</span>` : "";

      return `
        ${sep}
        <span class="form-alt">
          ${renderOneForm(form, displayMode)}
        </span>
      `;
    }).join("");
  }

  function renderProfileRow(label, value) {
    if (!hasText(value)) return "";

    return `
      <div class="profile-row">
        <span class="profile-label">${escapeHtml(label)}</span>
        <span class="profile-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function renderNotes(entry) {
    const notes = entry.notes || {};

    const rows = [
      ["व्युत्पत्ति", notes.vyutpatti],
      ["शब्द-टिप्पणी", notes.shabda_notes],
      ["सूचना", notes.info],
      ["SK", notes.sk],
      ["LSK", notes.lsk]
    ]
      .filter(([, value]) => hasText(value))
      .map(([label, value]) => renderProfileRow(label, value))
      .join("");

    if (!rows) return "";

    return `
      <div class="profile-notes">
        <div class="profile-section-title">Notes</div>
        ${rows}
      </div>
    `;
  }

  function renderWordProfile(entry) {
    const sourceId = entry.zbaseindex || entry.urlid || "";

    const meaningRows = [
      ["English", entry.meaning?.english],
      ["Hindi", entry.meaning?.hindi],
      ["Sanskrit", entry.meaning?.sanskrit]
    ]
      .filter(([, value]) => hasText(value))
      .map(([label, value]) => renderProfileRow(label, value))
      .join("");

    return `
      <section class="word-profile">
        <div class="profile-main">
          <div class="profile-kicker">Selected stem</div>

          <div class="profile-word">${escapeHtml(entry.word.deva)}</div>

          <div class="profile-translit">
            <span>${escapeHtml(entry.word.iast)}</span>
            <span class="profile-dot">·</span>
            <code>${escapeHtml(entry.word.slp1)}</code>
          </div>

          <div class="word-badges">
            <span class="badge">${escapeHtml(entry.linga.deva)}</span>
            <span class="badge">${escapeHtml(entry.linga.english)}</span>
            <span class="badge">${escapeHtml(entry.ending.deva)}-ending</span>
            <span class="badge">${escapeHtml(entry.ending.iast)}-ending</span>
          </div>
        </div>

        <div class="profile-details">
          <div class="profile-section-title">Meaning</div>
          ${meaningRows || `<div class="muted">No meaning supplied.</div>`}

          <div class="profile-section-title profile-source-title">Source</div>
          ${renderProfileRow("Source index", sourceId)}
          ${renderProfileRow("URL id", entry.urlid)}
        </div>

        ${renderNotes(entry)}
      </section>
    `;
  }

  function renderTable(entry, displayMode = "deva-iast") {
    if (!entry) {
      return `<div class="empty-table">Select a stem to view its declension table.</div>`;
    }

    if (!entry.forms) {
      return `<div class="empty-table">No valid forms available for this entry.</div>`;
    }

    const rows = CASES.map(([caseKey, caseDeva, caseIast]) => {
      const cells = NUMBERS.map(([numKey]) => {
        return `<td>${renderFormCell(entry.forms[caseKey]?.[numKey], displayMode)}</td>`;
      }).join("");

      return `
        <tr>
          <td>
            <span class="case-label">${caseDeva}</span>
            <span class="case-iast">${caseIast}</span>
          </td>
          ${cells}
        </tr>
      `;
    }).join("");

    return `
      ${renderWordProfile(entry)}

      <div class="declension-table-wrap">
        <table class="declension-table">
          <thead>
            <tr>
              <th>विभक्ति</th>
              <th>एकवचन</th>
              <th>द्विवचन</th>
              <th>बहुवचन</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  global.ShabdaTableRenderer = {
    renderTable
  };
})(window);
