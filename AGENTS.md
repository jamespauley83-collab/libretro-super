# AGENTS.md — Libretro Super

## What this repo is
libretro-super: a shell-script build toolchain for fetching, compiling, and
installing libretro/RetroArch cores (C/C++). It is NOT a web application.

## Web Dashboard (Base44 addition)
A React + Vite dashboard was added under `web/` that browses the repo's data:
- **Cores tab**: all 331 cores parsed from `dist/info/*.info` files
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
- `GET /api/cores/:name` — single core detail + build recipes
- `GET /api/recipes` — all build recipes grouped by platform
- `GET /api/stats` — summary statistics

### Notes
- Some `.info` files lack a `corename` field; the sort handles this
- Recipe files are identified by having no file extension (skip .conf, .ra)
- The `REPO_ROOT` env var (default: `/repo`) points to the repo root for file parsing
