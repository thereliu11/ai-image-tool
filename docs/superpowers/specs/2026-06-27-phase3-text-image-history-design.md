# Phase 3 Text-To-Image And Unified History Design

## Goal

Add a focused third-stage workflow that makes the tool feel closer to the reference app: an independent 文生图工作台 and a single history drawer for generated results.

## Scope

In scope:

- Add a top-level `文生图` workbench.
- Let users build structured teaching-material prompts from template, style, grade, subject, ratio, quality, title, subtitle, and points.
- Generate prompt-only images through OpenAI-compatible image generation endpoints, including LupoAPI/AiHubMix-compatible providers.
- Save text-to-image results into the same local history store used by the creation page.
- Add a unified history dialog with type/status filters, preview, open folder, mark satisfied, mark review, and reuse prompt.

Out of scope for this phase:

- Cloud task-ID polling for third-party async providers.
- Full batch page-range processing inside text-to-image.
- Advanced style cloning from 3-5 reference images.
- Cross-device cloud sync of history.

## Data Flow

The renderer owns the workbench form state and uses pure helpers in `textToImageWorkflow.mjs` to normalize prompts and requests. The main process exposes `text-to-image-generate`, writes the generated image to the configured output directory, and returns file paths. App-level history remains in `taskHistory.mjs`, extended with generic generated records so create-page, text-to-image, and later tools can share one schema.

## Components

- `TextToImageWorkbench.vue`: structured prompt builder, generate button, local result preview, and history reuse entry.
- `UnifiedHistoryDialog.vue`: centralized history overlay.
- `taskHistory.mjs`: generic record creation plus existing create-page compatibility.
- `textToImageWorkflow.mjs`: prompt templates, ratio options, request normalization, and task summary.

## Error Handling

The UI blocks generation when the prompt is empty or no API key is configured. The main process returns friendly errors for unsupported providers, missing API keys, empty image responses, and 429/rate-limit failures.

## Testing

Add node tests for:

- Text-to-image prompt building and request normalization.
- Generic history record creation, filtering, marking, and stats.
- Existing task-history compatibility.
