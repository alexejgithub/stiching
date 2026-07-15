# 07 — Crop step constrained to target aspect ratio

**What to build:** Replace ticket 06's "whole image" behavior with a real crop step: rows/columns inputs driving a crop box the crafter can drag to reposition and drag-by-corner to resize, always locked to the rows/cols aspect ratio and clamped within the photo's bounds. The quantization pipeline from ticket 06 now samples the cropped region instead of the full photo.

**Blocked by:** 06

**Status:** resolved

- [x] Rows and columns inputs are bounded 1–500 (reusing the existing New Pattern dialog's bounds), defaulting to the app's existing default dimension
- [x] A crop box overlays the displayed image; dragging its body moves it, dragging a corner handle resizes it
- [x] The crop box's aspect ratio always matches the current rows/cols ratio — it never allows a stretch or letterbox crop
- [x] The crop box stays clamped within the image's displayed bounds during both move and resize
- [x] Changing rows or columns live-updates the crop box's aspect ratio without requiring the crafter to restart the crop
- [x] The photo is cropped to whatever region the box currently covers when the pipeline (ticket 06) runs — the resulting `Pattern`'s dimensions match the entered rows × cols
- [x] The crop interaction has full parity on stylus input; bare-finger touch does not break (per the existing touch/stylus parity bar), consistent with how the rest of the editor already handles touch/stylus — implemented with the same `touch-action: none` + pointer-capture-on-a-stable-element recipe as `PatternGrid`'s existing touch/stylus handling (index.css, ticket 38); not verified on physical touch/stylus hardware in this session
