# AI Context — Smart Data Cleaner

> **How to use this file:** Paste this whole file at the start of a conversation
> with an AI assistant. It describes the entire architecture so the AI knows
> exactly which file to open for any change. Then just describe what you want
> (e.g. "improve outlier detection") — do NOT paste the whole codebase.

## 1. What this project is
A single-page, **100% client-side** data cleaning tool (no backend, no build
step). The user uploads a CSV/Excel file in the browser; everything runs in
JavaScript. Data never leaves the browser.

- **Libraries (CDN):** PapaParse (CSV), SheetJS/xlsx (Excel).
- **No framework, no bundler.** All JS functions are **global** and files are
  loaded in order via `<script>` tags in `index.html`.
- **Language:** all code and comments are in English.

## 2. Golden rules for editing (READ FIRST)
1. Every JS file starts with a **numbered table of contents**; keep it in sync
   if you add/remove a function.
2. Functions are global — do **not** convert files to ES modules or add
   `import/export`; it would break the `<script>` load model.
3. **Load order matters.** `08-app.js` MUST stay last (it calls `renderNav()`).
   Core files (01–07) must load before section files (10–25).
4. Shared state lives in the single global `state` object (see §4). Never
   duplicate it.
5. After any data transform, always go through `applyChange(newDf, description,
   action)` — it handles history, cache invalidation and re-render.
6. Keep changes **inside one block** whenever possible. State the file you
   edited in your answer.

## 3. File map (which file does what)
| File | Responsibility |
|------|----------------|
| `index.html` | Page shell, loads CSS + all JS in order |
| `css/styles.css` | ALL styling (numbered sections 0.1–0.14) |
| `js/01-config-state.js` | Global `state`, constants, error markers, goals, templates, intent detection, `saveUI/getUI` |
| `js/02-helpers.js` | `toast`, `applyChange`, `isMissing/isInvalid`, math helpers, progress modal, batched processing, multi-select widget |
| `js/03-metrics.js` | Cached metrics, `countMissing/Invalid/Duplicates`, `qualityAudit`, `columnRecommendation`, fill strategies, `computeFillValue` |
| `js/04-types.js` | `detectType`, `parseNumberValue`, `parseDateValue`, `detectDateFormat`, `MONTH_MAP`, smart date/text split |
| `js/05-diagnostic.js` | Column profiling, correlations (`pearson`), `detectFormulas`, `detectMappings`, `diagnose`, all `fix*` helpers, `buildRecommendations` |
| `js/06-charts.js` | SVG `chart()`, `qualityTrend`, `renderTable` |
| `js/07-fileio.js` | `handleFile`, drag & drop, `loadData` |
| `js/08-app.js` | Navigation (`renderNav`), routing (`renderSection`), bootstrap. **Loads last.** |
| `js/sections/10-setup.js` | Setup screen: goal input, templates → builds workflow |
| `js/sections/11-preview.js` | Data preview (columns + first rows) |
| `js/sections/12-diagnostic-view.js` | Diagnostic dashboard: score, column profile, insights, grouped recommendations; also `renderOverview` |
| `js/sections/13-columns.js` | Column ops: drop/filter, rename, standardize, split, merge |
| `js/sections/14-types.js` | Type correction: to date / to number, smart split |
| `js/sections/15-duplicates.js` | Duplicate row removal |
| `js/sections/16-missing.js` | Missing values: pattern fill (formula/mapping), manual fill, smart imputation, formula fill, drop rows |
| `js/sections/17-invalid.js` | Invalid markers: auto-suggest, custom markers, full scan, fix; bulk text cleaning |
| `js/sections/18-outliers.js` | Outlier detection (IQR), box/histogram, range trim, threshold lists |
| `js/sections/19-formulas.js` | Add / modify calculated columns |
| `js/sections/20-rules.js` | Business rules (presets + custom), violations, removal |
| `js/sections/21-text.js` | Bulk text cleaning (trim, case, accents) |
| `js/sections/22-visualizations.js` | Auto charts + custom chart builder |
| `js/sections/23-express.js` | One-click express cleaning |
| `js/sections/24-history.js` | Action history, undo, reset, export recipe (JSON) |
| `js/sections/25-compare.js` | Before/after, export CSV/Excel, `generatePython` |

## 4. Shared state (`state` object, defined in 01)
| Field | Meaning |
|-------|---------|
| `df` | Current data: array of row objects |
| `columns` | Current column names |
| `originalDf` | Untouched copy for reset/compare |
| `history` | Applied actions (with snapshots for undo) |
| `rules` | Active business rules |
| `customMarkers` | User-added invalid markers |
| `guidedMode`, `workflow` | Guided navigation state |
| `ui` | Per-section UI values (via `saveUI/getUI`) |
| `typeCache`, `_mc`, `diag`, `_patterns` | Caches (auto-cleared by `applyChange`) |
| `goal`, `recs` | Current analysis goal + recommendations |

## 5. Key conventions
- **Add a data transform:** write the new `df`, then call
  `applyChange(newDf, "Human description", {type:"my_action", params:{...}})`.
  For large data, wrap it in `await processBatched(...)`.
- **Export to Python:** if you add a new `action.type`, also add a matching
  `case` in `generatePython()` (file 25) so the exported script stays correct.
- **Add a cleaning step (new section):** create `js/sections/NN-name.js` with a
  `renderYourSection(container)` function, register it in the `map` object in
  `renderSection` (file 08), and add it to `ALL_SECTIONS` (file 01) + the
  `<script>` list in `index.html`.
- **Value checks:** always use `isMissing()` / `isInvalid()` (file 02), never
  raw `== null`.

## 6. "I want to change X → edit this file"
| I want to... | Edit |
|--------------|------|
| Change colors / spacing / layout | `css/styles.css` |
| Add/adjust recognized error markers (N/A, #REF!, ...) | `js/01-config-state.js` (§1.3) |
| Change how a column type is guessed | `js/04-types.js` (`detectType`) |
| Improve date parsing / add a date format | `js/04-types.js` (`parseDateValue`, `detectDateFormat`) |
| Change the quality score formula | `js/03-metrics.js` (`qualityAudit`) |
| Improve auto-detected formulas / mappings | `js/05-diagnostic.js` (`detectFormulas`, `detectMappings`) |
| Change diagnostic recommendations | `js/05-diagnostic.js` (`buildRecommendations`) |
| Restyle the diagnostic dashboard | `js/sections/12-diagnostic-view.js` |
| Change outlier logic or UI | `js/sections/18-outliers.js` |
| Change missing-value strategies | `js/03-metrics.js` (strategies) + `js/sections/16-missing.js` (UI) |
| Add/modify a chart type | `js/06-charts.js` (`chart`) + `js/sections/22-visualizations.js` |
| Change CSV/Excel export | `js/sections/25-compare.js` |
| Change the generated Python script | `js/sections/25-compare.js` (`generatePython`) |
| Add a business-rule preset | `js/sections/20-rules.js` |
| Change navigation / add a step | `js/08-app.js` + `js/01-config-state.js` + `index.html` |

## 7. Known cleanup TODOs
- `parseDateValue` / `detectDateFormat` were duplicated in the original code —
  keep only the versions in `04-types.js`.
- Text-cleaning helpers exist in both `17-invalid.js` and `21-text.js` — keep
  the canonical version in `21-text.js`.
