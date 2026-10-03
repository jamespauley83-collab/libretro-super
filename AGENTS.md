# AGENTS.md — Libretro Super

## What this repo is
libretro-super: a shell-script build toolchain for fetching, compiling, and
installing libretro/RetroArch cores (C/C++). It is NOT a web application.

## Web Dashboard (Base44 addition)
A React + Vite dashboard was added under `web/` that browses the repo's data:
- **Cores tab**: 329 cores parsed from `dist/info/*_libretro.info` files (excluding the example template)
- **Recipes tab**: build recipes from `recipes/<platform>/` files
- Express API server (port 3001) parses .info and recipe files
- Vite dev server (port 3000) proxies `/api` to the backend

### Running it
```
docker compose -f docker-compose.base44.yml up -d
```
Single container runs both Vite and Express via `concurrently`.

### Key files
- `web/server/parseCores.js` — parses `.info` files (key = value format)
- `web/server/parseRecipes.js` — parses recipe files (space-separated columns)
- `web/src/App.jsx` — main React app with tabs
- `web/src/components/` — UI components

### API endpoints
- `GET /api/cores?search=&category=` — list/filter cores
- `GET /api/cores/:id` — single core detail + build recipes, using the filename-derived `id` returned by the list endpoint (for example, `fbneo`)
- `GET /api/recipes` — all build recipes grouped by platform
- `GET /api/stats` — summary statistics

### Notes
- Some `.info` files lack a `corename` field; the sort handles this
- Recipe files are identified by having no file extension (skip .conf, .ra)
- The `REPO_ROOT` env var (default: `/repo`) points to the repo root for file parsing
- Core `id` removes the trailing `_libretro.info` from the metadata filename. Use it for selection, React keys, and detail lookup; recipe matching compares IDs case-insensitively against both recipe names and generated multi-target names. Retain `corename` and `display_name` for display.

### Dashboard checks (without Docker)
From `web/`, run `npm ci`, `npm test`, and `npm run build`.
For browser regressions, run `npx playwright install chromium`, then `npm run test:e2e`.
An existing Chromium binary can be used with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium`.
The browser tests start the API and Vite on ports 3001 and 3000; those ports must be free.
The API also accepts `PORT` (default: 3001); API tests use a temporary port.

### Standalone Python preview
The existing `preview/server.py` remains available without Node dependencies:
run `PORT=3002 python3 preview/server.py` from the repository root. It reads
metadata on each request and serves `/` (catalog), `/core/<file>.info` (detail),
and `/raw/<file>.info` (raw metadata). Base44 Compose runs the React dashboard
above on port 3000; the Python preview can run separately on port 3002.
