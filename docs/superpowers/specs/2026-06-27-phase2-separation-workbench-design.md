# Phase 2 Graphic/Text Separation Workbench Design

## Goal

Build the B-plan independent workbench for graphic/text separation inside the AI teaching image tool. The workbench must let users import teaching material images, run OCR into editable text layers, add mask/brush regions, edit fonts, and export edited results.

## Scope

In scope:

- Add a new top-level tab named `图文分离`.
- Provide a three-pane workbench:
  - Left: imported page list, statuses, current page selection.
  - Center: image canvas with editable text and mask layers.
  - Right: layer list, layer properties, font tools, export settings.
- Support importing multiple image files.
- Support OCR extraction for the current page and turn OCR lines into editable text layers.
- Support adding text layers, rectangle mask layers, and brush mask stamps.
- Support selecting, nudging, deleting, and editing layer properties.
- Support font list loading and applying one font to all text layers.
- Add main-process export support:
  - Render edited image files with `sharp`.
  - Export PPT with mask-rendered image backgrounds and editable text boxes.
  - Export Word through the existing rendered image/OCR export fallback.

Out of scope for this phase:

- Full Photoshop-like history stack.
- Freeform vector paths beyond simple brush stamps.
- Pixel-level inpainting. AI eraser remains available as a separate existing tool.
- Complex filter/color grading pipeline.

## Architecture

Create small pure-logic utilities in `src/renderer/src/utils/separationWorkspace.mjs` and test them before UI code. The Vue workbench component will keep all editor state client-side and call existing Electron APIs for file dialogs, OCR, fonts, and folder opening. A new `separation-export` IPC in `src/main/main.js` will receive normalized page/layer data and generate real output files.

## Data Model

Page:

- `id`
- `name`
- `imagePath`
- `status`: `pending | ocr | edited | exported | failed`
- `layers`

Layer:

- `id`
- `type`: `text | mask | brush`
- `x`, `y`, `width`, `height`: normalized 0-100 canvas coordinates
- `text`, `fontFamily`, `fontSize`, `color`, `fill`, `opacity`
- `locked`

## Export Logic

For image export, all visible layers are rendered into PNG/JPEG files.

For PPT export:

1. Render each page background with mask and brush layers using `sharp`.
2. Add that rendered background to a slide.
3. Add text layers as editable PowerPoint text boxes.

For Word export, render edited images first and pass them to the existing Word OCR export as a compatibility path.

## Testing

Add `tests/separation-workspace.test.mjs` covering:

- Page creation from file paths.
- Text, mask, and brush layer creation.
- Layer update/delete/nudge behavior.
- OCR text conversion to editable layers.
- Batch font application.
- Export payload generation.

Verification commands:

- `npm test`
- `npm run build:renderer`
- `node --check src/main/main.js`
- `node --check src/preload/preload.js`

