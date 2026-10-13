#!/usr/bin/env python3
"""Generate a Sweden-only, non-indexable country SEO preview.

Run from the repository root. Requires country.html and SUPABASE_ANON_KEY.
Writes seo-preview/country/sweden-test.html and a validation JSON file.
Does not modify deployed pages.
"""
import html
import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co'
KEY = os.environ.get('SUPABASE_ANON_KEY', '')
COUNTRY = 'Sweden'
OUTPUT = Path('seo-preview/country/sweden-test.html')
REPORT = Path('seo-preview/validation-country-sweden.json')


def value(row, key):
    raw = row.get(key)
    return '' if raw is None else str(raw).strip()


def esc(text):
    return html.escape(str(text), quote=True)


def fetch():
    if not KEY:
        raise RuntimeError('Missing SUPABASE_ANON_KEY environment variable')
    rows, offset, limit = [], 0, 500
    while True:
        params = urlencode({'select': '*', 'Country': 'eq.Sweden',
                            'order': 'Year.desc', 'limit': limit, 'offset': offset})
        req = Request(f'{SUPABASE_URL}/rest/v1/douzepoints?{params}', headers={
            'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Accept': 'application/json'})
        with urlopen(req, timeout=30) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < limit:
            return rows
        offset += limit


def generate(rows):
    template_path = Path('country.html')
    if not template_path.exists():
        raise RuntimeError('country.html not found at repository root')
    page = template_path.read_text(encoding='utf-8')
    # Avoid the original query-string canonical and title replacement scripts.
    page, n = re.subn(r'\s*<!-- DECLARE CANONICAL PAGE\s*-->\s*<script>.*?</script>',
                      '', page, count=1, flags=re.S)
    if n != 1:
        raise RuntimeError('Could not locate old canonical script in country.html')
    page, n = re.subn(r'\s*<!-- Dynamically change the title -->\s*<script>.*?</script>',
                      '', page, count=1, flags=re.S)
    if n != 1:
        raise RuntimeError('Could not locate dynamic title script in country.html')
    page = page.replace('<title>{Country} Eurovision Results & History | DouzePoints</title>',
                        '<title>Sweden Eurovision Results, Songs & History | DouzePoints</title>', 1)
    if '<title>Sweden Eurovision' not in page:
        raise RuntimeError('Could not replace title in country.html')
    head_meta = ('\n        <meta name="description" content="Explore Sweden at Eurovision: '
                 'year-by-year entries, artists, songs, winners and results.">\n'
                 '        <meta name="robots" content="noindex,follow">\n')
    page = page.replace('</head>', head_meta + '    </head>', 1)
    # Convert relative assets to root-relative URLs for /country/ subdirectory.
    page = re.sub(r'(?P<attr>\b(?:src|href)\s*=\s*["\'])(?P<path>(?:style|js)/)',
                  lambda m: m.group('attr') + '/' + m.group('path'), page)
    entries = []
    for row in sorted(rows, key=lambda r: (-int(value(r, 'Year') or 0), value(r, 'Song'))):
        year = esc(value(row, 'Year'))
        artist = esc(value(row, 'Artist'))
        song = esc(value(row, 'Song'))
        rank = value(row, 'Final_Rank')
        detail = f' — Final position: {esc(rank)}' if rank and rank != '0' else ''
        entries.append(f'<li><strong>{year}</strong> — {artist}: <em>{song}</em>{detail}</li>')
    winners = [r for r in rows if value(r, 'Final_Rank') == '1']
    winner_list = ''.join(f'<li>{esc(value(r, "Year"))} — {esc(value(r, "Artist"))}: '
                          f'<em>{esc(value(r, "Song"))}</em></li>' for r in winners)
    seo = f'''\n<section class="seo-country" aria-label="Sweden Eurovision history">
  <h1>Sweden at Eurovision — Results, Songs &amp; History</h1>
  <p>Explore Sweden's Eurovision entries, artists, songs and recorded results from the DouzePoints archive.</p>
  <h2>Sweden's Eurovision Winners</h2>
  <ul>{winner_list or '<li>No recorded winners in the current archive.</li>'}</ul>
  <details class="seo-participants">
    <summary>Sweden's Eurovision entries by year</summary>
    <ul>{''.join(entries)}</ul>
  </details>
</section>
<style>
  .seo-country {{ box-sizing:border-box; max-width:100%; min-width:0; margin:45px 20px 40px;
                  color:#ccc; overflow-wrap:anywhere; line-height:1.7; }}
  .seo-country h1,.seo-country h2 {{ color:#fff; }}
  .seo-country h1 {{ font-size:clamp(24px,3vw,34px); }}
  .seo-country h2 {{ font-size:21px; margin-top:28px; }}
  .seo-country ul {{ padding-left:24px; }}
  .seo-country details {{ border-top:1px solid #333; margin-top:28px; padding-top:16px; }}
  .seo-country summary {{ cursor:pointer; color:#fff; font-weight:600; }}
  .main-content {{ min-width:0; }}
</style>'''
    marker = '<div class="grid-container" id="video-container"></div>'
    if page.count(marker) != 1:
        raise RuntimeError('Could not uniquely locate video gallery in country.html')
    page = page.replace(marker, marker + seo, 1)
    return page


def main():
    report = {'country': COUNTRY, 'test_url': '/country/sweden-test.html', 'passed': False}
    try:
        rows = fetch()
        report['entries'] = len(rows)
        report['years'] = len({value(r, 'Year') for r in rows})
        report['winners'] = sum(value(r, 'Final_Rank') == '1' for r in rows)
        report['issues'] = []
        if not rows:
            report['issues'].append('No Sweden entries returned')
        if any(value(r, 'Country').casefold() != 'sweden' for r in rows):
            report['issues'].append('Unexpected country in query results')
        if report['issues']:
            raise RuntimeError('; '.join(report['issues']))
        page = generate(rows)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(page, encoding='utf-8')
        report['passed'] = True
        print(f'Generated {OUTPUT} ({len(rows)} entries)')
    except Exception as exc:
        report['issues'] = [str(exc)]
        print(f'FAILED: {exc}')
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding='utf-8')
    if not report['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
