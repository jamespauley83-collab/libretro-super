#!/usr/bin/env python3
"""Lightweight preview server for the libretro-super core-info catalog.

Serves a browsable, searchable catalog of every *.info file in dist/info/.
Each request re-reads the files from disk, so edits appear immediately.
Standard library only — no dependencies to install.
"""

import html
import os
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

INFO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist", "info")
PORT = int(os.environ.get("PORT", "3000"))

# Fields shown as compact columns in the catalog table
COLUMN_FIELDS = ["display_name", "categories", "license", "systemname", "savestate", "disk_control"]

# Fields shown in full on a detail page, in order
DETAIL_SECTIONS = [
    ("Software Information", ["display_name", "authors", "supported_extensions", "corename",
                              "license", "permissions", "display_version", "categories"]),
    ("Hardware Information", ["manufacturer", "systemname", "systemid"]),
    ("Libretro Features", ["supports_no_game", "database", "savestate", "savestate_features",
                           "cheats", "input_descriptors", "memory_descriptors", "libretro_saves",
                           "core_options", "core_options_version", "hw_render", "disk_control"]),
]


def parse_info(path):
    """Parse a key = value .info file into an ordered dict."""
    data = {}
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r'^([a-zA-Z0-9_]+)\s*=\s*(.*)$', line)
            if m:
                val = m.group(2).strip()
                # .info files wrap values in double quotes; strip them so
                # comparisons (opt == "true") and display render correctly.
                if len(val) >= 2 and val[0] == '"' and val[-1] == '"':
                    val = val[1:-1]
                data[m.group(1)] = val
    return data


def load_all():
    """Return a list of (filename, data) sorted by display_name."""
    cores = []
    for name in sorted(os.listdir(INFO_DIR)):
        if not name.endswith(".info"):
            continue
        try:
            data = parse_info(os.path.join(INFO_DIR, name))
        except OSError:
            continue
        cores.append((name, data))
    cores.sort(key=lambda c: c[1].get("display_name", c[0]).lower())
    return cores


def render_catalog(cores, query=""):
    rows = []
    q = query.lower()
    for fname, data in cores:
        haystack = " ".join(data.values()).lower() + " " + fname.lower()
        if q and q not in haystack:
            continue
        cells = [html.escape(data.get(f, "") or "—") for f in COLUMN_FIELDS]
        display = html.escape(data.get("display_name", fname.replace("_libretro.info", "")))
        rows.append(
            f'<tr class="core-row" data-name="{display.lower()}">'
            f'<td><a href="/core/{html.escape(fname)}">{display}</a></td>'
            f'<td class="mono">{html.escape(fname)}</td>'
            + "".join(f"<td>{c}</td>" for c in cells)
            + "</tr>"
        )

    total = len(cores)
    shown = len(rows)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>libretro Core Info Catalog</title>
<style>
  :root {{ --bg:#1a1a2e; --surface:#16213e; --card:#0f3460; --accent:#e94560;
           --text:#eee; --muted:#8892b0; --link:#64ffda; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font-family:system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); }}
  header {{ background:var(--surface); padding:1.5rem 2rem; border-bottom:2px solid var(--card); }}
  header h1 {{ margin:0 0 .25rem; font-size:1.5rem; }}
  header p {{ margin:0; color:var(--muted); font-size:.9rem; }}
  .toolbar {{ display:flex; align-items:center; gap:1rem; flex-wrap:wrap; padding:1rem 2rem; }}
  input[type=search] {{ flex:1; min-width:200px; padding:.6rem .9rem; border:1px solid var(--card);
     border-radius:6px; background:var(--surface); color:var(--text); font-size:1rem; }}
  input[type=search]:focus {{ outline:none; border-color:var(--accent); }}
  .count {{ color:var(--muted); font-size:.85rem; white-space:nowrap; }}
  main {{ padding:0 2rem 2rem; overflow-x:auto; }}
  table {{ width:100%; border-collapse:collapse; font-size:.875rem; }}
  th, td {{ text-align:left; padding:.55rem .7rem; border-bottom:1px solid var(--surface); }}
  th {{ background:var(--surface); color:var(--muted); font-weight:600; position:sticky; top:0; }}
  tr.core-row:hover {{ background:var(--surface); }}
  a {{ color:var(--link); text-decoration:none; }}
  a:hover {{ text-decoration:underline; }}
  .mono {{ font-family:ui-monospace,monospace; font-size:.8rem; color:var(--muted); }}
  .pill {{ display:inline-block; padding:.1rem .5rem; border-radius:99px; font-size:.75rem; }}
  .pill-true {{ background:#1b4332; color:#74c69d; }}
  .pill-false {{ background:#3d1f1f; color:#e76f51; }}
  .pill-na {{ background:var(--surface); color:var(--muted); }}
  footer {{ padding:1rem 2rem 2rem; color:var(--muted); font-size:.8rem; }}
</style>
</head>
<body>
<header>
  <h1>🎮 libretro Core Info Catalog</h1>
  <p>Browsable preview of <strong>{total}</strong> core info files from <code>dist/info/</code></p>
</header>
<div class="toolbar">
  <input type="search" id="filter" placeholder="Filter by name, system, license…" value="{html.escape(query)}" autofocus>
  <span class="count" id="count">{shown} / {total} cores</span>
</div>
<main>
<table>
  <thead><tr>
    <th>Core</th><th>File</th>
    <th>Display Name</th><th>Category</th><th>License</th><th>System</th>
    <th>Save State</th><th>Disc Control</th>
  </tr></thead>
<tbody id="rows">
{"".join(rows)}
</tbody>
</table>
</main>
<footer>libretro-super · dist/info · live preview — edits to .info files appear on refresh</footer>
<script>
const input = document.getElementById('filter');
const rows = document.querySelectorAll('tr.core-row');
const countEl = document.getElementById('count');
const total = rows.length;
input.addEventListener('input', () => {{
  const q = input.value.toLowerCase();
  let shown = 0;
  rows.forEach(r => {{
    const match = r.dataset.name.includes(q) || r.textContent.toLowerCase().includes(q);
    r.style.display = match ? '' : 'none';
    if (match) shown++;
  }});
  countEl.textContent = shown + ' / ' + total + ' cores';
}});
</script>
</body>
</html>"""


def render_detail(fname, data):
    sections = []
    for title, fields in DETAIL_SECTIONS:
        rows = []
        for f in fields:
            if f in data:
                val = html.escape(data[f])
                rows.append(f"<tr><td class='key'>{html.escape(f)}</td><td>{val}</td></tr>")
        if rows:
            sections.append(f"<h2>{title}</h2><table>{''.join(rows)}</table>")

    # Firmware entries
    fw_count = data.get("firmware_count", "0")
    fw_rows = []
    try:
        n = int(fw_count)
    except ValueError:
        n = 0
    for i in range(n):
        desc = data.get(f"firmware{i}_desc", "")
        path = data.get(f"firmware{i}_path", "")
        opt = data.get(f"firmware{i}_opt", "")
        if desc or path:
            tag = "optional" if opt == "true" else "required"
            fw_rows.append(
                f"<tr><td class='key'>{html.escape(desc)}</td>"
                f"<td class='mono'>{html.escape(path)}</td>"
                f"<td><span class='pill pill-{'true' if opt=='true' else 'false'}'>{tag}</span></td></tr>"
            )
    if fw_rows:
        sections.append(f"<h2>BIOS / Firmware ({n})</h2><table>{''.join(fw_rows)}</table>")

    # Notes + description
    if "notes" in data:
        notes = " | ".join(html.escape(n) for n in data["notes"].split("|"))
        sections.append(f"<h2>Notes</h2><p class='notes'>{notes}</p>")
    if "description" in data:
        sections.append(f"<h2>Description</h2><p class='notes'>{html.escape(data['description'])}</p>")

    raw_url = f"/raw/{fname}"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(data.get("display_name", fname))}</title>
<style>
  :root {{ --bg:#1a1a2e; --surface:#16213e; --card:#0f3460; --accent:#e94560;
           --text:#eee; --muted:#8892b0; --link:#64ffda; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font-family:system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); }}
  header {{ background:var(--surface); padding:1.5rem 2rem; border-bottom:2px solid var(--card); }}
  header a {{ color:var(--link); text-decoration:none; font-size:.85rem; }}
  header h1 {{ margin:.5rem 0 .25rem; font-size:1.4rem; }}
  header .fname {{ color:var(--muted); font-family:ui-monospace,monospace; font-size:.85rem; }}
  main {{ max-width:760px; margin:0 auto; padding:2rem; }}
  h2 {{ color:var(--accent); font-size:1rem; margin-top:2rem; border-bottom:1px solid var(--surface); padding-bottom:.3rem; }}
  table {{ width:100%; border-collapse:collapse; font-size:.875rem; }}
  td {{ padding:.4rem .6rem; border-bottom:1px solid var(--surface); }}
  td.key {{ color:var(--muted); width:40%; font-family:ui-monospace,monospace; font-size:.8rem; }}
  .mono {{ font-family:ui-monospace,monospace; font-size:.8rem; }}
  .notes {{ line-height:1.6; font-size:.9rem; }}
  .pill {{ display:inline-block; padding:.1rem .5rem; border-radius:99px; font-size:.75rem; }}
  .pill-true {{ background:#1b4332; color:#74c69d; }}
  .pill-false {{ background:#3d1f1f; color:#e76f51; }}
  .raw-link {{ display:inline-block; margin-top:1rem; padding:.5rem 1rem; border:1px solid var(--card);
              border-radius:6px; color:var(--link); text-decoration:none; font-size:.85rem; }}
  .raw-link:hover {{ border-color:var(--accent); }}
</style>
</head>
<body>
<header>
  <a href="/">← Back to catalog</a>
  <h1>{html.escape(data.get("display_name", fname))}</h1>
  <span class="fname">{html.escape(fname)}</span>
</header>
<main>
{"".join(sections)}
<a class="raw-link" href="{raw_url}">View raw .info file →</a>
</main>
</body>
</html>"""


def render_raw(path):
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "":
            query = parse_qs(parsed.query).get("q", [""])[0]
            body = render_catalog(load_all(), query).encode("utf-8")
            self._send(200, "text/html; charset=utf-8", body)

        elif path.startswith("/core/"):
            fname = os.path.basename(path[len("/core/"):])
            fpath = os.path.join(INFO_DIR, fname)
            if not fname.endswith(".info") or not os.path.isfile(fpath):
                self._send(404, "text/plain", b"Not found")
                return
            data = parse_info(fpath)
            body = render_detail(fname, data).encode("utf-8")
            self._send(200, "text/html; charset=utf-8", body)

        elif path.startswith("/raw/"):
            fname = os.path.basename(path[len("/raw/"):])
            fpath = os.path.join(INFO_DIR, fname)
            if not fname.endswith(".info") or not os.path.isfile(fpath):
                self._send(404, "text/plain", b"Not found")
                return
            body = render_raw(fpath).encode("utf-8")
            self._send(200, "text/plain; charset=utf-8", body)

        else:
            self._send(404, "text/plain", b"Not found")

    def _send(self, code, ctype, body):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Suppress default noisy logging; print concise access lines
        print(f"[{self.log_date_time_string()}] {fmt % args}")


if __name__ == "__main__":
    print(f"Serving libretro core info catalog from {INFO_DIR} on 0.0.0.0:{PORT}")
    httpd = HTTPServer(("0.0.0.0", PORT), Handler)
    httpd.serve_forever()
