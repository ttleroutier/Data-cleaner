# 🧼 Smart Data Cleaner

A single-page, **100% client-side** data cleaning tool. Upload a CSV or Excel
file, get an automatic quality diagnostic, and clean your data step by step.
Nothing is ever uploaded to a server — all processing happens in your browser.

## Features
- Automatic column profiling & data quality score
- Smart detection of arithmetic formulas (`total = qty × price`) and value mappings
- Missing value imputation (mean / median / mode / formula / smart mapping)
- Invalid marker detection (`N/A`, `#REF!`, `-`, ...) with auto-suggestions
- Duplicate removal, outlier trimming (IQR), business rules
- Built-in charts (histogram, bar, pie, box, scatter)
- Full undo history + export to CSV / Excel / pandas Python script

## Run locally
No dependencies to install. Just open `index.html` in a browser, or serve it:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Project layout
| Path | Responsibility |
|------|----------------|
| `index.html` | Page shell, loads all assets |
| `css/styles.css` | All styling |
| `js/01-config-state.js` | Global state & constants |
| `js/02-helpers.js` | Generic helpers |
| `js/03-metrics.js` | Metrics & quality audit |
| `js/04-types.js` | Type detection & parsing |
| `js/05-diagnostic.js` | Diagnostic engine & recommendations |
| `js/06-charts.js` | Chart rendering |
| `js/07-fileio.js` | File loading |
| `js/08-app.js` | Navigation & routing |
| `js/sections/*` | One file per cleaning step |

## Third-party libraries (loaded from CDN)
- [PapaParse](https://www.papaparse.com/) — CSV parsing
- [SheetJS (xlsx)](https://sheetjs.com/) — Excel read/write
