#!/usr/bin/env python3
"""Generate non-indexable country SEO previews from public.douzepoints.

Run from repo root; requires country.html and SUPABASE_ANON_KEY.
Never writes to the live country/ directory.
"""
import html
import json
import os
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co'
KEY = os.environ.get('SUPABASE_ANON_KEY', '')
OUT = Path('country')
SITE = 'https://www.douzepoints.org'


def val(row, key):
    v = row.get(key)
    return '' if v is None else str(v).strip()


def esc(v):
    return html.escape(str(v), quote=True)


def slugify(name):
    ascii_name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', ascii_name.lower()))


def fetch_all():
    if not KEY:
        raise RuntimeError('Missing SUPABASE_ANON_KEY environment variable')
    rows = []
    batch_size = 500
    offset = 0
    while True:
        params = urlencode({'select': '*', 'order': 'Country.asc,Year.desc',
                            'limit': batch_size, 'offset': offset})
        req = Request(f'{SUPABASE_URL}/rest/v1/douzepoints?{params}', headers={
            'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Accept': 'application/json'})
        with urlopen(req, timeout=40) as response:
            batch = json.load(response)
        if not isinstance(batch, list):
            raise RuntimeError('Supabase response was not an array')
        rows.extend(batch)
        if len(batch) < batch_size:
            return rows
        offset += batch_size


def template():
    page = Path('country.html').read_text(encoding='utf-8')
    page, n1 = re.subn(r'\s*<!-- DECLARE CANONICAL PAGE\s*-->\s*<script>.*?</script>',
                       '', page, count=1, flags=re.S)
    page, n2 = re.subn(r'\s*<!-- Dynamically change the title -->\s*<script>.*?</script>',
                       '', page, count=1, flags=re.S)
    if (n1, n2) != (1, 1):
        raise RuntimeError('Expected country.html canonical/title scripts not found')
    page = re.sub(r'(?P<attr>\b(?:src|href)\s*=\s*["\'])(?P<path>(?:style|js)/)',
                  lambda m: m.group('attr') + '/' + m.group('path'), page)
    return page



value = val

def page_for(base, name, slug, rows):
    title = f'{name} Eurovision Results, Songs & History | DouzePoints'
    old_title = '<title>{Country} Eurovision Results & History | DouzePoints</title>'
    if base.count(old_title) != 1:
        raise RuntimeError('Could not uniquely locate country.html title')
    page = base.replace(old_title, f'<title>{esc(title)}</title>', 1)
    description = f'Explore {name} at Eurovision: year-by-year entries, artists, songs, winners and recorded results.'
    meta = (f'\n<meta name="description" content="{esc(description)}">'
            f'\n<link rel="canonical" href="{SITE}/country/{slug}.html">\n')
    page = page.replace('</head>', meta + '</head>', 1)
    valid = sorted([r for r in rows if value(r, 'Year').isdigit()], key=lambda r: (-int(value(r, 'Year')), value(r, 'Song')))
    winners = [r for r in valid if value(r, 'Final_Rank') == '1']
    finalists = [r for r in valid if value(r, 'Final_Rank').isdigit() and int(value(r, 'Final_Rank')) > 0]
    first_year = min((int(value(r, 'Year')) for r in valid), default=None)
    best_rank = min((int(value(r, 'Final_Rank')) for r in finalists), default=None)
    def edition_link(row, label):
        year = value(row, 'Year')
        return f'<a href="/edition/{esc(year)}.html">{label}</a>'
    winner_cards = ''.join(
        f'<li><span class="seo-winner-year">{edition_link(r, esc(value(r, "Year")))}</span>'
        f'<span><strong>{esc(value(r, "Artist"))}</strong><small>{esc(value(r, "Song"))}</small></span>'
        f'<span class="seo-winner-badge">Winner</span></li>' for r in winners
    )
    table_rows = []
    for r in valid:
        rank = value(r, 'Final_Rank')
        result = f'{esc(rank)}' if rank.isdigit() and int(rank) > 0 else '—'
        table_rows.append(
            f'<tr><td>{edition_link(r, esc(value(r, "Year")))}</td>'
            f'<td><strong>{esc(value(r, "Artist"))}</strong><span class="seo-song">{esc(value(r, "Song"))}</span></td>'
            f'<td>{result}</td></tr>'
        )
    stats = [
        ('Entries in archive', str(len(valid))),
        ('Recorded wins', str(len(winners))),
        ('First entry in archive', str(first_year) if first_year else '—'),
        ('Best recorded final rank', str(best_rank) if best_rank else '—'),
    ]
    stat_html = ''.join(f'<div class="seo-stat"><span>{esc(k)}</span><strong>{esc(v)}</strong></div>' for k,v in stats)
    seo = f'''\n<section class="seo-country" aria-label="{esc(name)} Eurovision history">
  <div class="seo-panel seo-history"><div class="seo-heading"><div class="seo-eyebrow">COUNTRY HISTORY</div>
  <h1>{esc(name)} at Eurovision</h1></div>
  <p class="seo-intro">Explore {esc(name)}'s Eurovision songs, artists, winners and year-by-year results in the DouzePoints archive.</p>
  <div class="seo-stats">{stat_html}</div>
  </div><div class="seo-panel seo-winners-panel"><div class="seo-heading"><h2>{esc(name)}'s Eurovision winners</h2></div>
  <ul class="seo-winners">{winner_cards or '<li>No winners recorded in the current archive.</li>'}</ul>
  </div><div class="seo-panel seo-results-panel"><div class="seo-heading"><h2>{esc(name)}'s year-by-year Eurovision results</h2></div>
  <p class="seo-note">Final rank is shown where recorded. A dash indicates no final placing is recorded; it does not necessarily mean the entry failed to qualify.</p>
  <div class="seo-table-scroll"><table class="seo-results"><thead><tr><th>Year</th><th>Artist and song</th><th>Final rank</th></tr></thead>
  <tbody>{''.join(table_rows)}</tbody></table></div>
</div>
</section>
<style>
  .seo-country {{ box-sizing:border-box; max-width:1100px; min-width:0; margin:48px auto 44px; padding:0 20px; color:#c8c8c8; line-height:1.6; font-family:Raleway,Arial,sans-serif; overflow-wrap:anywhere; }}
  .seo-country * {{ box-sizing:border-box; }}
  .seo-panel {{ background:#1b1d23; border:1px solid #34363c; border-radius:16px; padding:clamp(18px,2.6vw,28px); margin:0 0 22px; }}
  .seo-heading {{ border-left:4px solid #e50914; padding-left:16px; margin-bottom:22px; }}
  .seo-heading h1,.seo-heading h2 {{ margin:0; }}
  .seo-heading .seo-eyebrow {{ margin-bottom:5px; }}
  .seo-panel .seo-stat,.seo-panel .seo-winners li {{ background:#292b30; border-color:#393b42; }}
  .seo-panel .seo-results td {{ border-bottom-color:#393b42; }}

  .seo-country .seo-eyebrow {{ color:#e50914; font-weight:700; letter-spacing:.12em; font-size:12px; }}
  .seo-country h1,.seo-country h2 {{ color:#fff; }}
  .seo-country h1 {{ font-size:clamp(25px,3vw,36px); margin:7px 0 8px; }}
  .seo-country h2 {{ font-size:clamp(19px,2vw,24px); margin:0; }}
  .seo-country .seo-intro {{ margin:0 0 24px; }}
  .seo-country a {{ color:#fff; text-decoration:underline; text-decoration-color:#e50914; text-underline-offset:3px; }}
  .seo-country a:hover {{ color:#ff525b; }}
  .seo-stats {{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }}
  .seo-stat {{ background:#242424; border:1px solid #363636; border-radius:10px; padding:16px; }}
  .seo-stat span {{ display:block; color:#aaa; font-size:12px; }}
  .seo-stat strong {{ display:block; color:#fff; font-size:clamp(18px,2vw,26px); margin-top:5px; }}
  .seo-winners {{ list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }}
  .seo-winners li {{ display:flex; align-items:center; gap:15px; background:#242424; border:1px solid #363636; border-radius:10px; padding:15px; min-width:0; }}
  .seo-winner-year {{ font-size:18px; font-weight:700; }}
  .seo-winners li > span:nth-child(2) {{ flex:1; min-width:0; }}
  .seo-winners strong,.seo-winners small {{ display:block; }}
  .seo-winners small {{ color:#bbb; }}
  .seo-winner-badge {{ color:#ff5962; font-size:12px; font-weight:700; }}
  .seo-note {{ font-size:13px; color:#aaa; }}
  .seo-table-scroll {{ width:100%; overflow-x:auto; }}
  .seo-results {{ border-collapse:collapse; width:100%; text-align:left; }}
  .seo-results th {{ color:#aaa; font-size:12px; border-bottom:1px solid #555; padding:12px; }}
  .seo-results td {{ border-bottom:1px solid #333; padding:12px; vertical-align:top; }}
  .seo-results td:last-child {{ white-space:nowrap; }}
  .seo-song {{ display:block; color:#aaa; font-size:13px; }}
  .main-content {{ min-width:0; }}
  @media(max-width:700px) {{ .seo-stats {{ grid-template-columns:repeat(2,minmax(0,1fr)); }} .seo-winners {{ grid-template-columns:1fr; }} .seo-country {{ padding:0 14px; }} }}
</style>'''
    marker = '<div class="grid-container" id="video-container"></div>'
    if page.count(marker) != 1:
        raise RuntimeError('Could not uniquely locate video gallery in country.html')
    page = page.replace(marker, marker + seo, 1)
    return page


def main():
    rows = fetch_all()
    if not rows:
        raise RuntimeError('No Supabase entries returned')
    grouped = defaultdict(list)
    for row in rows:
        if val(row, 'Country'):
            grouped[val(row, 'Country')].append(row)
    if len(grouped) != 52:
        raise RuntimeError(f'Expected 52 countries, received {len(grouped)}; refusing incomplete rollout')
    slugs = [slugify(name) for name in grouped]
    if len(set(slugs)) != len(slugs):
        raise RuntimeError('Country slug collision')
    base = template()
    OUT.mkdir(parents=True,exist_ok=True)
    for name in sorted(grouped):
        slug = slugify(name)
        result = page_for(base,name,slug,grouped[name])
        if result.count('class="seo-panel ') != 3:
            raise RuntimeError(f'Incomplete SEO layout for {name}')
        (OUT / f'{slug}.html').write_text(result,encoding='utf-8')
    print(f'Generated {len(grouped)} Option 4 country pages in {OUT}/')

if __name__ == '__main__':
    main()
