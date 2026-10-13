#!/usr/bin/env python3
"""Generate production-ready country SEO pages for manual review from public.douzepoints.

Run from repo root; requires country.html and SUPABASE_ANON_KEY.
Writes to seo-production/country/ only; never deploys automatically.
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
OUT = Path('seo-production')
SITE = 'https://douzepoints.org'


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


def page_for(base, name, slug, rows):
    title = f'{name} Eurovision Results, Songs & History | DouzePoints'
    old_title = '<title>{Country} Eurovision Results & History | DouzePoints</title>'
    if base.count(old_title) != 1:
        raise RuntimeError('Could not uniquely replace country.html title')
    page = base.replace(old_title, f'<title>{esc(title)}</title>', 1)
    description = (f'Explore {name} at Eurovision: year-by-year entries, artists, '
                   'songs, winners and recorded results.')
    meta = (f'\n<meta name="description" content="{esc(description)}">'
            '\n<meta name="robots" content="index,follow">'
            f'\n<link rel="canonical" href="{SITE}/country/{slug}.html">\n')
    page = page.replace('</head>', meta + '</head>', 1)
    entries = []
    def sortkey(r):
        year = val(r, 'Year')
        return (-(int(year) if year.isdigit() else 0), val(r, 'Song'))
    for row in sorted(rows, key=sortkey):
        rank = val(row, 'Final_Rank')
        detail = f' — Final position: {esc(rank)}' if rank and rank != '0' else ''
        entries.append(f'<li><strong>{esc(val(row, "Year"))}</strong> — '
                       f'{esc(val(row, "Artist"))}: <em>{esc(val(row, "Song"))}</em>{detail}</li>')
    winners = sorted((r for r in rows if val(r, 'Final_Rank') == '1'), key=sortkey)
    win_html = ''.join(f'<li>{esc(val(r, "Year"))} — {esc(val(r, "Artist"))}: '
                       f'<em>{esc(val(r, "Song"))}</em></li>' for r in winners)
    seo = f'''\n<section class="seo-country" aria-label="{esc(name)} Eurovision history">
  <h1>{esc(name)} at Eurovision — Results, Songs &amp; History</h1>
  <p>Explore {esc(name)}'s Eurovision entries, artists, songs and recorded results from the DouzePoints archive.</p>
  <h2>{esc(name)}'s Eurovision Winners</h2>
  <ul>{win_html or '<li>No recorded winners in the current archive.</li>'}</ul>
  <details class="seo-participants">
    <summary>{esc(name)}'s Eurovision entries by year</summary>
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
    return page.replace(marker, marker + seo, 1)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'mode': 'production-artifact-only', 'robots': 'index,follow', 'countries': [],
              'issues': [], 'total_entries': 0}
    try:
        rows = fetch_all()
        report['total_entries'] = len(rows)
        if not rows:
            raise RuntimeError('No rows returned from Supabase')
        base = template()
        grouped = defaultdict(list)
        for row in rows:
            name = val(row, 'Country')
            if not name:
                report['issues'].append('A database row has a blank Country')
                continue
            grouped[name].append(row)
        slugs = defaultdict(list)
        for name in grouped:
            slugs[slugify(name)].append(name)
        for slug, names in slugs.items():
            if not slug or len(names) > 1:
                report['issues'].append(f'Invalid or colliding slug {slug!r}: {names}')
        page_dir = OUT / 'country'
        page_dir.mkdir(exist_ok=True)
        for name in sorted(grouped, key=str.casefold):
            country_rows = grouped[name]
            slug = slugify(name)
            issues = []
            if not slug or len(slugs[slug]) > 1:
                issues.append('Unsafe or colliding slug')
            # Current video2.js reconstructs country by replacing URL hyphens with spaces.
            # Names containing punctuation (e.g. &) require an explicit route mapping before deployment.
            if slug.replace('-', ' ').casefold() != name.casefold() and (slug, name) not in {('bosnia-hercegovina', 'Bosnia & Hercegovina'), ('serbia-montenegro', 'Serbia & Montenegro')}:
                issues.append('Unrecognised special country slug: verify route mapping')
            if any(not val(r, 'Year') or not val(r, 'Artist') or not val(r, 'Song') for r in country_rows):
                issues.append('Some rows lack Year, Artist or Song; review data')
            record = {'country': name, 'slug': slug, 'entries': len(country_rows),
                      'years': len({val(r, 'Year') for r in country_rows}),
                      'winners': sum(val(r, 'Final_Rank') == '1' for r in country_rows),
                      'issues': issues, 'generated': False}
            if slug and len(slugs[slug]) == 1:
                try:
                    output = page_dir / f'{slug}.html'
                    output.write_text(page_for(base, name, slug, country_rows), encoding='utf-8')
                    record['generated'] = True
                    record['preview_file'] = str(output)
                except Exception as exc:
                    record['issues'].append(f'Generation failed: {exc}')
            report['countries'].append(record)
        report['generated'] = sum(c['generated'] for c in report['countries'])
        import xml.etree.ElementTree as ET
        sitemap_root = ET.parse('sitemap.xml').getroot()
        listed = {n.text for n in sitemap_root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc') if n.text and '/country/' in n.text}
        expected_urls = {f"{SITE}/country/{c['slug']}.html" for c in report['countries'] if c['generated']}
        report['sitemap_missing'] = sorted(expected_urls - listed)
        report['sitemap_extra'] = sorted(listed - expected_urls)
        if report['sitemap_missing'] or report['sitemap_extra']:
            report['issues'].append('Sitemap does not match generated country pages')
        report['review_required'] = [c['country'] for c in report['countries'] if c['issues']]
        report['passed'] = not report['issues'] and not report['review_required'] and report['generated'] == len(grouped)
        # Confirm every generated page has the expected canonical and is indexable.
        for record in report['countries']:
            if not record['generated']:
                continue
            page_text = (page_dir / f"{record['slug']}.html").read_text(encoding='utf-8')
            expected = f'<link rel="canonical" href="{SITE}/country/{record["slug"]}.html">'
            if page_text.count(expected) != 1 or 'content="index,follow"' not in page_text or 'noindex' in page_text.lower():
                record['issues'].append('Canonical or robots validation failed')
                report['passed'] = False
        report['review_required'] = [c['country'] for c in report['countries'] if c['issues']]
    except Exception as exc:
        report['issues'].append(str(exc))
        report['passed'] = False
    (OUT / 'country-summary.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'total_countries': len(report['countries']),
                      'generated': report.get('generated', 0),
                      'review_required': report.get('review_required', []),
                      'issues': report['issues'], 'passed': report['passed']}, indent=2))
    if not report['passed']:
        raise SystemExit('Production validation failed; inspect seo-production/country-summary.json')


if __name__ == '__main__':
    main()
