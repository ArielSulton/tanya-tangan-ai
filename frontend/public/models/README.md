# TFJS Model Bundles

This directory holds trained models for runtime browser inference.

Populated by `training/convert_to_tfjs.sh` after training notebooks complete.

## static/

- `model.json` — graph topology
- `group1-shard*.bin` — quantized weights
- `labels.json` — JSON array of class labels in argmax-index order

Used by `frontend/src/lib/gesture/inference/static-classifier.ts`.
NOT wired into production (per user decision). Loaded only if explicitly invoked.

## dynamic/

Same files. Used by `frontend/src/lib/gesture/inference/dynamic-classifier.ts`,
which IS wired into `BrowserGestureEngine.handleRawHands` and fires on
`MotionDetector` `motion_end` events.

If no models are present (fresh checkout, never trained), inference silently
returns null and the engine emits no dynamic results. Fingerpose static path
still works normally.
