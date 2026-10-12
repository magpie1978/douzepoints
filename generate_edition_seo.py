
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
        f"Eurovision {year} final results, jury and "
        "televote points, rankings, artists and songs. "
        "Explore the full Eurovision archive."
    )
    canonical = f"{SITE}/edition/{year}.html"

    finalists = [
        r for r in rows
        if number(r.get("Final_Rank")) is not None
    ]
    winners = [
        r for r in finalists
        if number(r.get("Final_Rank")) == 1
    ]

    if len(winners) == 1:
        winner = winners[0]
        winner_summary = (
            f'<p class="seo-winner">'
            f'Winner: <strong>{safe(winner.get("Country"))}'
            f'</strong> — {safe(winner.get("Artist"))}, '
            f'<em>{safe(winner.get("Song"))}</em>.'
            f'</p>'
        )
    else:
        winner_summary = ""

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1">

  <title>{safe(title)}</title>
  <meta name="description" content="{safe(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{canonical}">

  <link rel="stylesheet" href="/style/combined.css">
  <link rel="stylesheet" href="/style/video-cards.css">
  <link rel="stylesheet" href="/style/favorites.css">
  <link rel="stylesheet" href="/style/footer.css">
  <link rel="stylesheet" href="/style/sidebar.css">
  <link rel="stylesheet" href="/style/mobile.css">

  <script src="/js/favicons.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <script async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1056703456722687"
    crossorigin="anonymous"></script>

  <script async
    src="https://www.googletagmanager.com/gtag/js?id=G-9BDCDNFMGG">
  </script>
  <script src="/js/analytics.js"></script>

  <style>
    .seo-edition {{
      padding: 0 20px 28px;
      max-width: 100%;
    }}
    .seo-edition h1 {{
      font-size: clamp(24px, 3vw, 34px);
      margin: 0 0 14px;
    }}
    .seo-edition h2 {{
      font-size: 21px;
      margin: 30px 0 14px;
    }}
    .seo-edition p {{
      line-height: 1.65;
    }}
    .seo-winner {{
      margin: 18px 0;
      font-size: 16px;
    }}
    .seo-results-scroll {{
      width: 100%;
      overflow-x: auto;
    }}
    .seo-results-scroll table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    .seo-results-scroll th,
    .seo-results-scroll td {{
      padding: 10px;
      border-bottom: 1px solid #444;
      text-align: left;
    }}
    .seo-results-scroll th {{
      background: #242424;
    }}
    .seo-entries {{
      columns: 2;
      padding-left: 22px;
      line-height: 1.8;
    }}
    @media (max-width: 700px) {{
      .seo-entries {{ columns: 1; }}
      .seo-edition {{ padding: 0 12px 24px; }}
    }}


        /* Prevent SEO content from widening the page */
    .container {{
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }}

    .main-content {{
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }}

    .seo-edition {{
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      color: #e5e5e5;
      margin-top: 45px;
      padding-bottom: 40px;
    }}

    .seo-edition h1,
    .seo-edition h2 {{
      color: #ffffff;
    }}

    .seo-edition p,
    .seo-edition li {{
      color: #cccccc;
    }}

    /* Scoreboard stays within the content area */
    .seo-results-scroll,
    .seo-results-scroll .results-scroll {{
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow-x: auto;
      box-sizing: border-box;
    }}

    .seo-results-scroll table {{
      width: 100%;
      min-width: 650px;
      border-collapse: collapse;
    }}

    .seo-results-scroll th,
    .seo-results-scroll td {{
      white-space: nowrap;
    }}

    /* Expandable participants section */
    .seo-participants {{
      margin-top: 35px;
      border-top: 1px solid #333;
      border-bottom: 1px solid #333;
      padding: 16px 0;
    }}

    .seo-participants summary {{
      cursor: pointer;
      color: #ffffff;
      font-size: 18px;
      font-weight: 600;
      padding: 10px 0;
    }}

    .seo-participants summary:hover {{
      color: #e50914;
    }}

    .seo-entries {{
      margin-top: 20px;
    }}
    
  </style>
</head>

<body oncontextmenu="return false">

  <div id="header-container"></div>
  <script type="module" src="/js/header.js"></script>

  <div class="container">

    <div id="sidebar-container" class="sidebar"></div>

    <div class="main-content">

      <div class="mobile-page-selector">
        <label id="mobile-page-selector-label"
               for="mobile-page-select"></label>
        <select id="mobile-page-select"></select>
      </div>

      <div class="header-bar"
           style="display:flex;justify-content:flex-end;
                  margin-bottom:40px;margin-right:20px;">

        <div style="flex:1"></div>

        <div class="sort-controls"
             style="display:flex;align-items:center;
                    padding-right:20px;">

          <label for="sort-options">
            <i data-lucide="list-filter"
               style="margin-right:15px"></i>
          </label>

          <select id="sort-options"
                  style="width:160px;padding:5px;
                         font-size:11px;">
            <option value="country" selected>
              Country (A–Z)
            </option>
            <option value="country-desc">
              Country (Z–A)
            </option>
            <option value="artist">Artist Name</option>
            <option value="song">Song Title</option>
            <option value="jury">Jury Points</option>
            <option value="televote">Televote Points</option>
            <option value="total">Total Points</option>
          </select>
        </div>
      </div>

      <div class="grid-container" id="video-container"></div>

      <!-- SEO content follows the video gallery -->
      <section class="seo-edition">

        <h1>Eurovision {year} Results &amp; Songs</h1>

        <p>
          Explore the Eurovision Song Contest {year}{safe(host)}.
          Browse the final scoreboard, voting results,
          participating countries, artists and songs.
        </p>

        {winner_summary}

        <h2>Eurovision {year} Final Scoreboard</h2>

        <div class="seo-results-scroll">
          {build_table(rows)}
        </div>

        <details class="seo-participants">
          <summary>
            Eurovision {year} Participating Countries,
            Artists &amp; Songs
          </summary>

          <div class="seo-entries">
            {build_entries(rows)}
          </div>
        </details>

      </section>

    </div>
  </div>

  <script src="/js/modal.js"></script>
  <div id="modal-container"></div>

  <script type="module" src="/js/video2.js"></script>

  <div id="footer"></div>
  <script src="/js/footer.js"></script>

  <script type="module" src="/js/sorting_edition2.js"></script>
  <script src="/js/icons.js"></script>
  <script type="module"
          src="/js/mobile-page-selector.js"></script>
  <script type="module"
          src="/js/sidebar_eurovision.js"></script>

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
