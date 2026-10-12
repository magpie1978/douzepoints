
#!/usr/bin/env python3
"""
Douze Points SEO preview generator.

Reads public Supabase data and generates:
  seo-preview/edition/2026.html
  seo-preview/validation-2026.json

Does not overwrite existing website pages.
"""

import os
import json
import html
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SUPABASE_URL = "https://eukgodthgusongsbhdwg.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
YEAR = 2026

OUTPUT = Path("seo-preview")
SITE = "https://douzepoints.org"

EXPECTED = {
    "entries": 35,
    "finalists": 25,
    "semifinal_results": 30,
    "jury_results": 25,
    "televote_results": 25,
}

def clean(value):
    return "" if value is None else str(value).strip()

def safe(value):
    return html.escape(clean(value), quote=True)

def number(value):
    value = clean(value).replace(",", "")
    try:
        return int(value)
    except ValueError:
        return None

def fetch_entries(year):
    if not SUPABASE_KEY:
        raise RuntimeError(
            "Set SUPABASE_ANON_KEY before running."
        )

    rows = []
    offset = 0
    batch_size = 500

    while True:
        params = urlencode({
            "select": "*",
            "Year": f"eq.{year}",
            "order": "Country.asc",
            "limit": batch_size,
            "offset": offset,
        })

        url = (
            f"{SUPABASE_URL}/rest/v1/douzepoints?"
            f"{params}"
        )

        request = Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Accept": "application/json",
        })

        with urlopen(request, timeout=30) as response:
            batch = json.load(response)

        rows.extend(batch)

        if len(batch) < batch_size:
            break

        offset += batch_size

    return rows

def has_value(row, field):
    return bool(clean(row.get(field)))

def build_table(rows):
    finalists = [
        row for row in rows
        if number(row.get("Final_Rank")) is not None
    ]

    finalists.sort(key=lambda row: (
        number(row.get("Final_Rank")),
        clean(row.get("Country"))
    ))

    if not finalists:
        return (
            "<p>Final rankings are not available "
            "for this edition.</p>"
        )

    def cell(value):
        return safe(value) if has_text(value) else "—"

    table_rows = []

    for row in finalists:
        table_rows.append(f"""
          <tr>
            <td>{cell(row.get("Final_Rank"))}</td>
            <td>{cell(row.get("Country"))}</td>
            <td>{cell(row.get("Artist"))}</td>
            <td>{cell(row.get("Song"))}</td>
            <td>{cell(row.get("Final_JuryPoints"))}</td>
            <td>{cell(row.get("Final_TelevotePoints"))}</td>
            <td>{cell(row.get("Final_TotalPoints"))}</td>
          </tr>
        """)

    return f"""
      <div class="results-scroll">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Country</th>
              <th>Artist</th>
              <th>Song</th>
              <th>Jury</th>
              <th>Televote</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {''.join(table_rows)}
          </tbody>
        </table>
      </div>
    """

def has_text(value):
    return bool(clean(value))

def build_entries(rows):
    entries = sorted(
        rows,
        key=lambda row: clean(row.get("Country"))
    )

    items = []

    for row in entries:
        country = safe(row.get("Country"))
        artist = safe(row.get("Artist"))
        song = safe(row.get("Song"))

        items.append(
            f"<li><strong>{country}</strong> — "
            f"{artist}: {song}</li>"
        )

    return "<ul>" + "\n".join(items) + "</ul>"

def build_page(rows, year):
    location = clean(rows[0].get("Location")) if rows else ""
    host = f" in {location}" if location else ""

    title = (
        f"Eurovision {year} Results, Songs & "
        "Scoreboard | Douze Points"
    )

    description = (
        f"Explore Eurovision {year} results, "
        "final rankings, jury and televote points, "
        "artists, songs and performances."
    )

    canonical = f"{SITE}/edition/{year}.html"

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1">
  <title>{safe(title)}</title>
  <meta name="description"
        content="{safe(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{canonical}">
  <style>
    body {{
      font-family: Arial, sans-serif;
      background: #141414;
      color: #f5f5f5;
      margin: 0;
      padding: 30px;
      line-height: 1.6;
    }}
    main {{ max-width: 1200px; margin: auto; }}
    h1, h2 {{ color: #fff; }}
    h2 {{ margin-top: 36px; }}
    .results-scroll {{ overflow-x: auto; }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }}
    th, td {{
      padding: 10px;
      border-bottom: 1px solid #444;
      text-align: left;
    }}
    th {{ background: #282828; }}
    tr:hover {{ background: #222; }}
    a {{ color: #ff6570; }}
    li {{ margin-bottom: 5px; }}
  </style>
</head>
<body>
  <main>
    <h1>Eurovision {year} Results &amp; Songs</h1>

    <p>
      Explore the Eurovision Song Contest {year}{safe(host)}.
      Browse the final scoreboard, voting results,
      participating countries, artists and songs.
    </p>

    <h2>Eurovision {year} Final Scoreboard</h2>
    {build_table(rows)}

    <h2>Eurovision {year} Participating Entries</h2>
    {build_entries(rows)}

    <p>
      <a href="{SITE}/">
        Explore the Douze Points Eurovision archive
      </a>
    </p>
  </main>
</body>
</html>
"""

def validate(rows):
    actual = {
        "entries": len(rows),
        "finalists": sum(
            has_value(r, "Final_Rank") for r in rows
        ),
        "semifinal_results": sum(
            has_value(r, "SemiFinal_Rank") for r in rows
        ),
        "jury_results": sum(
            has_value(r, "Final_JuryPoints") for r in rows
        ),
        "televote_results": sum(
            has_value(r, "Final_TelevotePoints") for r in rows
        ),
    }

    checks = {
        key: {
            "expected": expected,
            "actual": actual[key],
            "passed": actual[key] == expected
        }
        for key, expected in EXPECTED.items()
    }

    return {
        "year": YEAR,
        "checks": checks,
        "passed": all(
            check["passed"] for check in checks.values()
        )
    }

def main():
    print(f"Fetching Eurovision {YEAR} data...")
    rows = fetch_entries(YEAR)

    if not rows:
        raise RuntimeError(
            "No records returned. Check the key, "
            "RLS policies and selected year."
        )

    report = validate(rows)

    OUTPUT.mkdir(parents=True, exist_ok=True)

    report_path = OUTPUT / f"validation-{YEAR}.json"
    report_path.write_text(
        json.dumps(report, indent=2),
        encoding="utf-8"
    )

    if not report["passed"]:
        print("Validation failed:")
        print(json.dumps(report, indent=2))
        raise RuntimeError(
            "Page not generated because counts "
            "do not match the expected baseline."
        )

    page_dir = OUTPUT / "edition"
    page_dir.mkdir(parents=True, exist_ok=True)

    page_path = page_dir / f"{YEAR}.html"
    page_path.write_text(
        build_page(rows, YEAR),
        encoding="utf-8"
    )

    print("Validation passed.")
    print(f"Generated: {page_path}")
    print(f"Report: {report_path}")

if __name__ == "__main__":
    main()
