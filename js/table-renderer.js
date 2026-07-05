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

  function renderTable(entry, displayMode = "deva-iast") {
    if (!entry) {
      return `<div class="empty-table">Select a stem to view its declension table.</div>`;
    }

    if (!entry.forms) {
      return `<div class="empty-table">No valid forms available for this entry.</div>`;
    }

    const meaningParts = [
      entry.meaning?.english,
      entry.meaning?.hindi,
      entry.meaning?.sanskrit
    ].filter(Boolean);

    const meaningHtml = meaningParts.length
      ? meaningParts.map(x => `<div>${escapeHtml(x)}</div>`).join("")
      : `<div class="muted">No meaning supplied.</div>`;

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
      <div class="table-header">
        <div>
          <div class="word-title">${escapeHtml(entry.word.deva)}</div>
          <div class="word-subtitle">
            ${escapeHtml(entry.word.iast)} · ${escapeHtml(entry.word.slp1)}
          </div>

          <div class="word-badges">
            <span class="badge">${escapeHtml(entry.linga.deva)}</span>
            <span class="badge">${escapeHtml(entry.ending.deva)}-ending</span>
            <span class="badge">${escapeHtml(entry.zbaseindex || entry.urlid || "")}</span>
          </div>
        </div>

        <div class="meaning-box">
          <strong>Meaning</strong>
          ${meaningHtml}
        </div>
      </div>

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
