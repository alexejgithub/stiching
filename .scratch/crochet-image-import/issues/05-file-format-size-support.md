# Decide file format & size support, and error handling

Type: grilling
Blocked by: None
Status: resolved

## Question

- What image file formats does Import Image accept — the standard set browsers decode natively via `<img>`/canvas (JPEG, PNG, GIF, WebP), given this stays client-side only with no server-side conversion ([ticket 10](../../crochet-pattern-editor/issues/10-tech-stack.md))?
- Is there a file-size or source pixel-dimension cap, and if so what — guarding against a very large photo hanging the crop UI or the quantization pipeline (see [ticket 01](01-quantization-research.md)'s performance findings)?
- What's the error/empty-state UX for: an unsupported file type, a corrupt/unreadable file, or an image smaller than the chosen target grid?

## Answer

- **Accepted formats**: `<input accept="image/*">` with no hardcoded format whitelist — the browser's own `<img>` decoder is the single source of truth (`onload` = accepted, `onerror` = rejected). Mirrors the existing `.crochet` import's philosophy of trusting one check (`isPattern`'s shape validator) rather than hand-maintaining a list; the accepted format set grows for free as browsers add codecs.
- **Size cap**: a single generous **25 MB file-size cap**, checked before attempting to load the file — no separate pixel-dimension cap. The crop step only displays the `<img>` via CSS scaling (no canvas), and the sampling step's `drawImage` goes from the full-res source into a tiny rows×cols destination canvas regardless of source resolution — cost doesn't scale with source pixel count once ticket 01's downscale-to-~250px analysis cache kicks in. The cap exists only to guard against a pathological file (an accidentally-selected multi-hundred-MB RAW/TIFF/PSD) hanging the tab on decode, not against normal camera photos.
- **Error UX**:
  - Unsupported type and corrupt/unreadable file both collapse to one generic message via the `<img>` element's `onerror` — no attempt to distinguish "wrong extension" from "corrupt bytes," since both fail identically from the browser's perspective. Shown the same way `.crochet` import errors are today: a `<p role="alert">` next to the trigger, current in-progress pattern left untouched.
  - Over the 25MB cap: checked before attempting to decode, same display convention, message names the cap.
  - Image smaller than the target grid: **not an error** — no minimum enforced. `drawImage` upscaling a small source into a larger destination canvas doesn't fail, it just looks blockier/blurrier, the same tradeoff as choosing an oversized target grid for a small crop region. Consistent with ticket 02's "ceiling not guarantee, degrade gracefully" philosophy.
