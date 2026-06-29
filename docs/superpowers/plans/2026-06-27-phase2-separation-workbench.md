# Phase 2 Separation Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent `图文分离` workbench with editable text/mask layers and export support.

**Architecture:** Pure editor state helpers live in `src/renderer/src/utils/separationWorkspace.mjs`; the Vue workbench lives in `src/renderer/src/components/GraphicTextSeparationWorkbench.vue`; export rendering lives in `src/main/main.js` behind a new `separation-export` IPC exposed by `src/preload/preload.js`.

**Tech Stack:** Vue 3, Element Plus, Electron IPC, Sharp, pptxgenjs, node:test.

---

### Task 1: Editor State Helpers

**Files:**
- Create: `src/renderer/src/utils/separationWorkspace.mjs`
- Create: `tests/separation-workspace.test.mjs`
- Modify: `package.json`

- [ ] Write tests for page creation, layer creation, layer updates, OCR conversion, batch font, and export payload.
- [ ] Run `node tests/separation-workspace.test.mjs` and verify it fails because the module is missing.
- [ ] Implement the helper module.
- [ ] Run `node tests/separation-workspace.test.mjs` and verify it passes.
- [ ] Add the new test to `npm test`.

### Task 2: Main-Process Export IPC

**Files:**
- Modify: `src/main/main.js`
- Modify: `src/preload/preload.js`

- [ ] Add `separation-export` IPC handler.
- [ ] Add helper functions to render SVG overlays with Sharp.
- [ ] Add PPT export that uses rendered backgrounds plus editable text boxes.
- [ ] Expose `separationExport` in preload.
- [ ] Run `node --check src/main/main.js` and `node --check src/preload/preload.js`.

### Task 3: Vue Workbench

**Files:**
- Create: `src/renderer/src/components/GraphicTextSeparationWorkbench.vue`
- Modify: `src/renderer/src/App.vue`

- [ ] Add a new `图文分离` tab.
- [ ] Build three-pane layout: page list, central canvas, right properties panel.
- [ ] Wire import images, OCR current page, add text, add mask, brush stamp, delete layer, font loading, batch font, and export.
- [ ] Keep state local to this component.
- [ ] Run `npm run build:renderer`.

### Task 4: Catalog Integration And Verification

**Files:**
- Modify: `src/renderer/src/utils/featureCatalog.mjs`

- [ ] Mark the region editor feature as ready.
- [ ] Add a catalog entry for the independent workbench if missing.
- [ ] Run `npm test`.
- [ ] Run `npm run build:renderer`.
- [ ] Run `node --check src/main/main.js`.
- [ ] Run `node --check src/preload/preload.js`.

