# Vidyut WASM Experiment

This folder is an isolated Phase 2 experiment for Shabdrupāṇi.

The goal is to test whether Ambuda Vidyut / vidyut-prakriya can be called from browser JavaScript, ideally through WebAssembly, to provide derivational explanations.

## Important Design Rule

Phase 1 static declension tables remain authoritative.

Phase 2 derivations are explanatory and experimental.

## First Milestone

Answer this question:

```text
Can browser JavaScript call Vidyut and return one usable derivation result?
Possible First Targets

Nominal forms:

राम + सु  → रामः
राम + अम् → रामम्
राम + टा  → रामेण

If the available Vidyut API supports verbal generation more directly, begin with:

भू → भवति
Planned Experiment Files
experiments/vidyut-wasm/
  README.md
  index.html
  test.js
  vendor/
Future App Integration

Only after this experiment works should we add app integration.

Possible future app modules:

js/derivation/
  vidyut-loader.js
  derivation-api.js
  derivation-renderer.js

Future UI idea:

Table | Derivation | Notes
Success Criteria

The experiment succeeds if we can:

1. Load Vidyut-related code in the browser.
2. Send one Sanskrit grammatical input.
3. Receive a generated form or derivation/prakriyā output.
4. Display that output clearly.

