# Roadmap

## Phase 1 — Static Śabdarūpa Tables

Status: Complete.

Goals achieved:

- Import validated śabdarūpa data
- Normalize entries
- Provide multilingual search
- Provide ending and gender filters
- Render declension tables dynamically
- Support Devanāgarī, IAST, and SLP1 display
- Deploy as a static GitHub Pages app
- Use custom domain

## Phase 1 Possible Refinements

Future improvements that do not change the core architecture:

- Improve search ranking
- Add richer consonant-ending grouping
- Add compact mobile layout
- Add favorite stems
- Add print-friendly table view
- Add copy-table button
- Add export-to-CSV option
- Add source-link field if available
- Add Sanskrit UI labels toggle

## Phase 2 — Dynamic Derivations

Goal:

Add derivational explanations/prakriyā support.

Important principle:

```text
Static validated forms remain authoritative.
Dynamic derivations are explanatory.

Possible direction:

Study Ambuda Vidyut
Focus on vidyut-prakriya
Explore WASM build
Create isolated experiment outside the main app
Wrap derivation calls behind a local JS API
Add a new tab:
Table | Derivation | Notes
Phase 2 Experimental Plan
Create a separate branch:
git checkout -b phase2-vidyut-experiment
Build or obtain Vidyut WASM output.
Test one simple input.
Inspect output format.
Normalize output for display.
Add derivation panel only after the experiment is reliable.
Long-Term Goal

Shabdrupāṇi should become:

A polished Sanskrit declension and derivation learning environment.

Phase 1 answers:

What are the forms?

Phase 2 should answer:

How are the forms derived?

