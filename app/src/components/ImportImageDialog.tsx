import { type FormEvent, useEffect, useRef, useState } from 'react';
import { type CropRect, fitCropToAspectRatio } from '../model/crop';
import { type CropRegion, loadImageFile, revokeImage, sampleAnalysisBuffer } from '../model/imageSampling';
import { createPatternFromImport } from '../model/importPattern';
import { DEFAULT_DIMENSION, MAX_DIMENSION, MIN_DIMENSION, type Pattern, isValidDimension } from '../model/pattern';
import { type QuantizeResult, type RGB, quantizeImage } from '../model/quantize';
import { CropBox } from './CropBox';

interface ImportImageDialogProps {
  file: File;
  onCreate: (pattern: Pattern) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

type Step = 'loading' | 'crop' | 'preview' | 'name';

const MIN_COLOR_COUNT = 1;
const MAX_COLOR_COUNT = 8;
const DEFAULT_COLOR_COUNT = 8;

// The crop stage's on-screen size: capped so a large photo fits the dialog,
// grown so a tiny photo (spec explicitly allows one smaller than the target
// grid) is still large enough to drag a crop box on.
const MAX_STAGE_WIDTH = 480;
const MAX_STAGE_HEIGHT = 360;
const MIN_STAGE_DIMENSION = 200;
// Caps how far a tiny photo gets upscaled to reach MIN_STAGE_DIMENSION, so a
// pathologically small image (a handful of pixels) doesn't get blown up to
// the point of being unusable/blurry rather than just "not full-size".
const MAX_STAGE_UPSCALE = 10;

function computeStageSize(img: HTMLImageElement): { width: number; height: number } {
  const { naturalWidth: w, naturalHeight: h } = img;
  let scale = 1;
  if (w > MAX_STAGE_WIDTH || h > MAX_STAGE_HEIGHT) {
    scale = Math.min(MAX_STAGE_WIDTH / w, MAX_STAGE_HEIGHT / h);
  } else if (Math.max(w, h) < MIN_STAGE_DIMENSION) {
    scale = Math.min(MIN_STAGE_DIMENSION / Math.max(w, h), MAX_STAGE_UPSCALE);
  }
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

// Modal wizard styled like NewPatternDialog: Crop -> Preview & Colors ->
// Name & Create. The crop step never re-quantizes; the analysis buffer is
// downscaled and cached exactly once, when the crop is finalized ("Next"),
// and every later color-count tick re-quantizes only that cached buffer
// (ticket 08) - never the original photo.
export function ImportImageDialog({ file, onCreate, onCancel, onError }: ImportImageDialogProps) {
  const [step, setStep] = useState<Step>('loading');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imageSlotRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null);
  const [rows, setRows] = useState(DEFAULT_DIMENSION);
  const [cols, setCols] = useState(DEFAULT_DIMENSION);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [colorCount, setColorCount] = useState(DEFAULT_COLOR_COUNT);
  const analysisBufferRef = useRef<RGB[][] | null>(null);
  const [quantized, setQuantized] = useState<QuantizeResult | null>(null);
  const [name, setName] = useState('Imported Pattern');

  useEffect(() => {
    let cancelled = false;
    loadImageFile(file)
      .then((img) => {
        if (cancelled) return;
        imgRef.current = img;
        const size = computeStageSize(img);
        setStage(size);
        setCrop(fitCropToAspectRatio({ x: 0, y: 0, width: size.width, height: size.height }, cols / rows, size.width, size.height));
        setStep('crop');
      })
      .catch((err: unknown) => {
        if (!cancelled) onError(err instanceof Error ? err.message : 'That file could not be opened as an image.');
      });
    return () => {
      cancelled = true;
    };
    // Loads `file` exactly once for this dialog's lifetime - ImportImageControl
    // remounts the dialog (via key) rather than reusing it for a new file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (imgRef.current) revokeImage(imgRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== 'crop') return;
    const img = imgRef.current;
    const slot = imageSlotRef.current;
    if (!img || !slot) return;
    img.className = 'crop-stage-image';
    slot.replaceChildren(img);
  }, [step]);

  const rowsValid = isValidDimension(rows);
  const colsValid = isValidDimension(cols);

  function handleRowsChange(next: number) {
    setRows(next);
    if (Number.isInteger(next) && next >= MIN_DIMENSION && next <= MAX_DIMENSION && colsValid && stage) {
      setCrop((prev) => (prev ? fitCropToAspectRatio(prev, cols / next, stage.width, stage.height) : prev));
    }
  }

  function handleColsChange(next: number) {
    setCols(next);
    if (Number.isInteger(next) && next >= MIN_DIMENSION && next <= MAX_DIMENSION && rowsValid && stage) {
      setCrop((prev) => (prev ? fitCropToAspectRatio(prev, next / rows, stage.width, stage.height) : prev));
    }
  }

  function handleCropNext() {
    const img = imgRef.current;
    if (!rowsValid || !colsValid || !img || !crop || !stage) return;
    const scaleToNatural = img.naturalWidth / stage.width;
    const naturalCrop: CropRegion = {
      x: crop.x * scaleToNatural,
      y: crop.y * scaleToNatural,
      width: crop.width * scaleToNatural,
      height: crop.height * scaleToNatural,
    };
    const buffer = sampleAnalysisBuffer(img, naturalCrop);
    analysisBufferRef.current = buffer;
    setQuantized(quantizeImage(buffer, rows, cols, colorCount));
    setStep('preview');
  }

  function handleColorCountChange(next: number) {
    setColorCount(next);
    const buffer = analysisBufferRef.current;
    if (buffer) setQuantized(quantizeImage(buffer, rows, cols, next));
  }

  function handleSubmitName(e: FormEvent) {
    e.preventDefault();
    if (!quantized) return;
    const pattern = createPatternFromImport(name.trim() || 'Imported Pattern', quantized.grid, quantized.palette);
    onCreate(pattern);
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog import-image-dialog" role="dialog" aria-modal="true" aria-label="Import Image">
        {step === 'loading' && <p>Loading photo...</p>}

        {step === 'crop' && (
          <>
            <h2>Import Image</h2>
            <div className="import-grid-fields">
              <label>
                Rows
                <input type="number" value={rows} onChange={(e) => handleRowsChange(e.target.valueAsNumber)} />
              </label>
              <label>
                Columns
                <input type="number" value={cols} onChange={(e) => handleColsChange(e.target.valueAsNumber)} />
              </label>
            </div>
            {(!rowsValid || !colsValid) && (
              <p role="alert">
                Rows and columns must be whole numbers between {MIN_DIMENSION} and {MAX_DIMENSION}.
              </p>
            )}
            {stage && crop && (
              <div className="crop-stage" style={{ width: stage.width, height: stage.height }}>
                <div className="crop-stage-image-slot" ref={imageSlotRef} />
                <CropBox
                  stageWidth={stage.width}
                  stageHeight={stage.height}
                  aspectRatio={rowsValid && colsValid ? cols / rows : 1}
                  crop={crop}
                  onChange={setCrop}
                />
              </div>
            )}
            <div className="dialog-actions">
              <button type="button" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" onClick={handleCropNext} disabled={!rowsValid || !colsValid}>
                Next
              </button>
            </div>
          </>
        )}

        {step === 'preview' && quantized && (
          <>
            <h2>Preview & Colors</h2>
            <ImportPreviewCanvas grid={quantized.grid} palette={quantized.palette} />
            <label>
              Colors ({quantized.palette.length}
              {quantized.palette.length < colorCount ? ` of ${colorCount} requested` : ''})
              <input
                type="range"
                min={MIN_COLOR_COUNT}
                max={MAX_COLOR_COUNT}
                value={colorCount}
                onChange={(e) => handleColorCountChange(e.target.valueAsNumber)}
              />
            </label>
            <div className="import-palette-swatches">
              {quantized.palette.map((hex, i) => (
                <span key={i} className="import-palette-swatch" style={{ backgroundColor: hex }} title={hex} />
              ))}
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" onClick={() => setStep('crop')}>
                Back
              </button>
              <button type="button" onClick={() => setStep('name')}>
                Next
              </button>
            </div>
          </>
        )}

        {step === 'name' && (
          <form onSubmit={handleSubmitName}>
            <h2>Name & Create</h2>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" onClick={() => setStep('preview')}>
                Back
              </button>
              <button type="submit">Create Pattern</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ImportPreviewCanvasProps {
  grid: number[][];
  palette: string[];
}

// Draws the live pixelated preview to a canvas sized to the grid's own cell
// dimensions and scaled up with CSS (`image-rendering: pixelated`), so
// re-rendering on every slider tick stays cheap regardless of rows x cols -
// unlike one DOM element per cell, this doesn't grow with grid size.
function ImportPreviewCanvas({ grid, palette }: ImportPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = palette[grid[r][c]] ?? '#000000';
        ctx.fillRect(c, r, 1, 1);
      }
    }
  }, [grid, palette]);

  return <canvas ref={canvasRef} className="import-preview-canvas" />;
}
