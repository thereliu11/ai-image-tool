# Phase 3 Text-To-Image And Unified History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a usable 文生图 workbench and a shared local history dialog for generated results.

**Architecture:** Pure prompt/history helpers live in renderer utils and are tested with `node:test`. Prompt-only image generation is handled by a new Electron IPC in `src/main/main.js`. App-level state remains in `App.vue`, with the new workbench emitting generated history records upward.

**Tech Stack:** Vue 3, Element Plus, Electron IPC, Axios, node:test.

---

### Task 1: Prompt And History Utilities

**Files:**
- Create: `src/renderer/src/utils/textToImageWorkflow.mjs`
- Modify: `src/renderer/src/utils/taskHistory.mjs`
- Create: `tests/text-to-image-workflow.test.mjs`
- Modify: `tests/task-history.test.mjs`
- Modify: `package.json`

- [ ] Write tests for structured prompt generation, request normalization, and generic history records.
- [ ] Run the new tests and verify they fail before implementation.
- [ ] Implement the utility functions.
- [ ] Add the new test to `npm test`.

### Task 2: Main Process Text-To-Image API

**Files:**
- Modify: `src/main/main.js`
- Modify: `src/preload/preload.js`

- [ ] Add `text-to-image-generate` IPC.
- [ ] Implement OpenAI-compatible `/images/generations` request handling.
- [ ] Save the returned base64 image under configured output directories.
- [ ] Expose `textToImageGenerate` in preload.

### Task 3: Workbench And History UI

**Files:**
- Create: `src/renderer/src/components/TextToImageWorkbench.vue`
- Create: `src/renderer/src/components/UnifiedHistoryDialog.vue`
- Modify: `src/renderer/src/App.vue`

- [ ] Add `文生图` top-level tab.
- [ ] Build text-to-image form, prompt preview, generation result preview, and emit generated history records.
- [ ] Add a unified history button and dialog to App.
- [ ] Wire preview, open folder, mark satisfied/review, and prompt reuse.

### Task 4: Catalog And Verification

**Files:**
- Modify: `src/renderer/src/utils/featureCatalog.mjs`

- [ ] Add catalog entries for 文生图 and unified history.
- [ ] Run `npm test`.
- [ ] Run `npm run build:renderer`.
- [ ] Run `node --check src/main/main.js`.
- [ ] Run `node --check src/preload/preload.js`.
