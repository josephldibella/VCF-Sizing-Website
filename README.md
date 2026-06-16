# VCF 9.1 Sizing Calculator

This static site recreates the workbook-driven Management Domain Sizing flow as a
guided web calculator.

## Files

- `index.html` - main application shell
- `styles.css` - page styling
- `app.js` - calculator logic and rendering
- `data/lookups.js` - workbook-derived lookup tables for appliance sizing
- `data/lookups.json` - same data in JSON form
- `extract_workbook_data.py` - refreshes lookup data from the source workbook

## Refresh lookup data

```bash
python3 extract_workbook_data.py
```

## Local preview

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.
