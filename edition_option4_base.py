
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
YEARS = range(1956, 2027)

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

def build_table(rows, year):
    finalists = [
        row for row in rows
        if number(row.get("Final_Rank")) is not None
    ]

    finalists.sort(key=lambda row: (
        number(row.get("Final_Rank")),
        clean(row.get("Country"))
    ))

    if year == 1956:
        # Only the winning entry was officially announced in 1956.
        # The remaining entries must not be presented as ranked.
        return (
            "<p>Only the winning entry was officially announced in 1956. "
            "The full voting results and rankings of the other songs "
            "were not published.</p>"
        )

    if not finalists:
        return (
            "<p>Final rankings are not available "
            "for this edition.</p>"
        )

    columns = [("Rank", "Final_Rank"), ("Country", "Country"), ("Artist", "Artist"), ("Song", "Song")]
    if any(has_value(r, "Final_JuryPoints") for r in finalists):
        columns.append(("Jury", "Final_JuryPoints"))
    if any(has_value(r, "Final_TelevotePoints") for r in finalists):
        columns.append(("Televote", "Final_TelevotePoints"))
    if any(has_value(r, "Final_TotalPoints") for r in finalists):
        columns.append(("Total", "Final_TotalPoints"))

    def cell(value):
        return safe(value) if has_text(value) else "—"

    table_rows = []

    for row in finalists:
        cells = "".join(f"<td>{cell(row.get(field))}</td>" for _, field in columns)
        table_rows.append(f"<tr>{cells}</tr>")

    return f"""
      <div class="results-scroll">
        <table>
          <thead><tr>{''.join(f'<th>{label}</th>' for label, _ in columns)}</tr></thead>
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
        f"Eurovision {year} Results & Songs | Douze Points" if year != 2020 else "Eurovision 2020 Songs & Artists (Cancelled Contest) | Douze Points"
    )
    description = (
        "Eurovision 2020 was cancelled. Explore the participating artists, songs and videos."
        if year == 2020 else
        f"Eurovision {year} results, rankings, artists and songs. Explore the full Eurovision archive."
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

    if year == 1969 and len(winners) == 4:
        # The 1969 contest officially had four joint winners.
        winner_items = ", ".join(
            f'<strong>{safe(r.get("Country"))}</strong> — '
            f'{safe(r.get("Artist"))}, <em>{safe(r.get("Song"))}</em>'
            for r in sorted(winners, key=lambda r: clean(r.get("Country")))
        )
        winner_summary = (
            '<p class="seo-winner">Four joint winners (1969): '
            f'{winner_items}.</p>'
        )
    elif len(winners) == 1:
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

    if year == 2020:
        intro = ("The Eurovision Song Contest 2020 was cancelled due to the COVID-19 pandemic. "
                 "Explore the participating countries, artists and songs. "
                 "No final, rankings or voting results took place.")
        results_section = ""
    else:
        intro = (f"Explore the Eurovision Song Contest {year}{host}. "
                 "Browse the results, participating countries, artists and songs.")
        if year == 1956:
            intro += (" Only the winning song was officially announced; "
                      "other placements and full voting figures are unavailable.")
        elif year == 1969:
            intro += " The contest ended with four joint winners."
        results_heading = (
            "Eurovision 1956 Results" if year == 1956
            else f"Eurovision {year} Final Scoreboard"
        )
        results_section = (f'<h2>{results_heading}</h2>'
                           f'<div class="seo-results-scroll">{build_table(rows, year)}</div>')

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
          {html.escape(intro)}
        </p>

        {winner_summary}

        {results_section}

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

def validate(rows, year):
    actual = {
        "entries": len(rows),
        "finalists": sum(has_value(r, "Final_Rank") for r in rows),
        "semifinal_results": sum(has_value(r, "SemiFinal_Rank") for r in rows),
        "jury_results": sum(has_value(r, "Final_JuryPoints") for r in rows),
        "televote_results": sum(has_value(r, "Final_TelevotePoints") for r in rows),
    }
    issues = []
    if not rows:
        issues.append("No Supabase entries for this year")
    if year == 2020 and any(actual[k] for k in ("finalists", "jury_results", "televote_results")):
        issues.append("2020 contains competition results; review source data")
    if year != 2020 and actual["finalists"] == 0:
        issues.append("No final rankings available; review before publishing")
    if year == 1956 and sum(number(r.get("Final_Rank")) == 1 for r in rows) != 1:
        issues.append("1956 should have exactly one recorded winner")
    if year == 1969 and sum(number(r.get("Final_Rank")) == 1 for r in rows) != 4:
        issues.append("1969 should have exactly four joint winners")
    checks = {
        key: {"expected": expected, "actual": actual[key], "passed": actual[key] == expected}
        for key, expected in EXPECTED.items()
    } if year == 2026 else {}
    if checks and not all(c["passed"] for c in checks.values()):
        issues.append("2026 baseline mismatch")
    return {"year": year, "actual": actual, "checks": checks,
            "issues": issues, "passed": not issues}


def main():
    page_dir = OUTPUT / "edition"
    page_dir.mkdir(parents=True, exist_ok=True)
    reports = []
    for year in YEARS:
        print(f"Fetching Eurovision {year} data...")
        try:
            rows = fetch_entries(year)
            report = validate(rows, year)
            if report["passed"]:
                page_path = page_dir / f"{year}.html"
                page_path.write_text(build_page(rows, year), encoding="utf-8")
                print(f"Preview generated: {page_path}")
            else:
                print(f"Needs review: {year}: {report['issues']}")
        except Exception as exc:
            report = {"year": year, "passed": False, "issues": [str(exc)]}
            print(f"Failed: {year}: {exc}")
        reports.append(report)
        (OUTPUT / f"validation-{year}.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    summary = {"total_years": len(reports),
               "generated": sum(r["passed"] for r in reports),
               "needs_review": [r["year"] for r in reports if not r["passed"]]}
    (OUTPUT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
