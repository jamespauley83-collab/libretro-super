# libretro-super — Base44 Development Notes

## What this repo is

**libretro-super** is a collection of shell scripts for fetching, building, and
packaging libretro cores and RetroArch across many platforms. It is **not** a web
application — there is no package.json, no frontend framework, no web server.

The shippable artifact is the `dist/info/` directory: 330+ `.info` files that
describe each libretro core's metadata (display name, supported extensions,
license, firmware, savestate support, etc.). The GitHub Actions workflow
(`.github/workflows/core_info_package.yml`) bundles these into `info.7z`.

## Why the preview "failed to start"

Base44 expects a web entry point on port 3000. This repo has none, so the
import could not produce a live preview. The fix is `preview/server.py` — a
zero-dependency Python HTTP server that catalogs every `.info` file into a
searchable browsable page.

## How the preview works

- `preview/server.py` reads `dist/info/*.info` on every request (live — edits
  appear on refresh, no rebuild needed).
- `docker-compose.base44.yml` runs it via `python:3.12-slim` with the repo
  bind-mounted at `/app`.
- Routes: `/` (catalog), `/core/<file>.info` (detail page), `/raw/<file>.info`
  (raw file).

## The commit under investigation

`122a48f35ab19016878781cce660cea79d53b650` ("same_cdi: describe disc control,
save states and the DVC") updates `dist/info/same_cdi_libretro.info`:
supported_extensions adds `m3u`, license GPLv2→GPLv3, savestate false→true
(deterministic), disk_control false→true, adds `notes` and a longer
`description`. This is a metadata-only change; it does not affect any build
script.

## Verifying

```sh
docker compose -f docker-compose.base44.yml up -d --build
curl -s localhost:3000/ | head    # catalog page
curl -s localhost:3000/core/same_cdi_libretro.info | head  # detail page
```
