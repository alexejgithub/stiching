import { useEffect, useRef, useState } from 'react';
import { type Pattern } from '../model/pattern';
import { exportPatternAsSVG, exportPatternOverviewAsSVG } from '../persistence/exportSvg';
import { DEFAULT_CELL_SIZE_MM, computeExportLayout } from '../render/exportLayout';
import { buildExportPages } from '../render/exportRenderer';
import { buildOverviewSVG } from '../render/overviewRenderer';

interface ExportDialogProps {
  pattern: Pattern;
  onClose: () => void;
}

const CELL_SIZE_PRESETS_MM = [
  { label: 'Small (6mm)', value: 6 },
  { label: 'Medium (10mm)', value: 10 },
  { label: 'Large (14mm)', value: 14 },
];

// Preview/print live-mount every generated page's SVG imperatively into a
// plain container, the same technique PatternGrid.tsx uses for the live
// editor grid. On screen, `.export-preview`'s CSS caps the visible height so
// only roughly the first page shows without scrolling; print CSS (see
// index.css's `@media print` block) removes that cap and hides everything
// else in the document, so `window.print()` prints every generated page —
// the same artifact the Download button writes to disk, with no separate
// print-only rendering path.
//
// Ticket 41 adds a second, independent artifact: a single-page overview
// (`.export-overview-preview`, mounted the same imperative way). Only one of
// the two artifacts should ever hit the physical printer per `window.print()`
// call, so `handlePrintOverview`/`handlePrintPages` toggle a `printing-overview`
// class on the dialog root right before printing — index.css's `@media print`
// block reads that class to decide which preview container is visible, then
// `afterprint` clears it back to the default (paginated) state.
export function ExportDialog({ pattern, onClose }: ExportDialogProps) {
  const [cellSizeMm, setCellSizeMm] = useState(DEFAULT_CELL_SIZE_MM);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);

  const layout = computeExportLayout(pattern, cellSizeMm);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    const pages = buildExportPages(pattern, cellSizeMm);
    container.replaceChildren();
    pages.forEach((svg) => {
      const sheet = document.createElement('div');
      sheet.className = 'export-page-sheet';
      sheet.appendChild(svg);
      container.appendChild(sheet);
    });
  }, [pattern, cellSizeMm]);

  useEffect(() => {
    const container = overviewRef.current;
    if (!container) return;
    const svg = buildOverviewSVG(pattern);
    container.replaceChildren();
    const sheet = document.createElement('div');
    sheet.className = 'export-overview-sheet';
    sheet.appendChild(svg);
    container.appendChild(sheet);
  }, [pattern]);

  function handleCellSizeChange(value: number) {
    if (!Number.isNaN(value) && value > 0) setCellSizeMm(value);
  }

  function handlePrintPages() {
    dialogRef.current?.classList.remove('printing-overview');
    window.print();
  }

  function handlePrintOverview() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.classList.add('printing-overview');
    const clearPrintingOverview = () => {
      dialog.classList.remove('printing-overview');
      window.removeEventListener('afterprint', clearPrintingOverview);
    };
    window.addEventListener('afterprint', clearPrintingOverview);
    window.print();
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog export-dialog" role="dialog" aria-modal="true" aria-label="Export / Print" ref={dialogRef}>
        <h2>Export / Print</h2>
        <label>
          Cell size (mm)
          <input
            type="number"
            min={1}
            value={cellSizeMm}
            onChange={(e) => handleCellSizeChange(e.target.valueAsNumber)}
          />
        </label>
        <div className="export-presets">
          {CELL_SIZE_PRESETS_MM.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={preset.value === cellSizeMm ? 'export-preset selected' : 'export-preset'}
              onClick={() => setCellSizeMm(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p data-role="page-count-readout">
          {layout.pages.length === 1
            ? '1 page'
            : `${layout.pages.length} pages (${layout.pageRows} row${layout.pageRows === 1 ? '' : 's'} x ${
                layout.pageCols
              } col${layout.pageCols === 1 ? '' : 's'})`}
        </p>
        <div className="export-preview" ref={previewRef} />
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
          <button type="button" onClick={handlePrintPages}>
            Print
          </button>
          <button type="button" onClick={() => exportPatternAsSVG(pattern, cellSizeMm)}>
            Download
          </button>
        </div>

        <h3>Overview (single page)</h3>
        <p className="export-overview-hint">
          A reference-only, whole-pattern view scaled to fit one page — colors and legend only, no numbers or
          symbols.
        </p>
        <div className="export-overview-preview" ref={overviewRef} />
        <div className="dialog-actions">
          <button type="button" onClick={handlePrintOverview}>
            Print Overview
          </button>
          <button type="button" onClick={() => exportPatternOverviewAsSVG(pattern)}>
            Download Overview
          </button>
        </div>
      </div>
    </div>
  );
}
