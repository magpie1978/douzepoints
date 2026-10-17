#!/usr/bin/env python3
"""Stage 3: metadata-only transformation of 52 country + 71 edition HTML pages.

Reads existing generated pages (whose content comes from Supabase), changes only
<title> and meta description, and writes a reviewable artifact. No deployment.
"""
import argparse
import csv
import html
import re
import sys
from pathlib import Path

COUNTRY_COUNT = 52
EDITION_COUNT = 71


def plain(markup):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', markup)).split())


def one(pattern, text, label, flags=re.I | re.S):
    hits = list(re.finditer(pattern, text, flags))
    if len(hits) != 1:
        raise ValueError(f'{label}: expected exactly one match, got {len(hits)}')
    return hits[0]


def country_metadata(source, slug):
    heading = one(r'<h1>\s*(.*?)\s*</h1>', source, 'country h1')
    name_match = re.match(r'(.+?)\s+at Eurovision', plain(heading.group(1)), re.I)
    if not name_match:
        raise ValueError('Country heading not recognised')
    name = name_match.group(1)
    stats = dict((plain(k), plain(v)) for k, v in re.findall(
        r'<div class="seo-stat"><span>(.*?)</span><strong>(.*?)</strong></div>', source, re.S))
    wins = int(stats.get('Recorded wins', '0'))
    first = stats.get('First entry in archive', '')
    winner_list = one(r'<ul class="seo-winners">(.*?)</ul>', source, 'winner list').group(1)
    winners = re.findall(r'<li>.*?<a href="/edition/(\d{4})\.html">.*?</a>.*?<small>(.*?)</small>.*?</li>', winner_list, re.S)
    if len(winners) != wins:
        raise ValueError(f'Winner count mismatch: stat={wins}, winner cards={len(winners)}')
    title = f'{name} at Eurovision: Winners & Results'
    if wins:
        years = ', '.join(y for y, _ in winners[:3])
        song = plain(winners[0][1])
        description = (f'Explore {name} at Eurovision: {wins} winning '
                       f'{"entry" if wins == 1 else "entries"}, including {song} ({winners[0][0]}). '
                       f'See year-by-year results, artists and songs.')
    else:
        description = (f'Explore {name} at Eurovision: year-by-year results, '
                       f'participating artists, songs and contest history' +
                       (f' since {first}.' if first and first != '—' else '.'))
    return title, description


def edition_metadata(source, year):
    section = one(r'<section class="seo-edition".*?</section>', source, 'edition section').group(0)
    host_match = re.search(r'<span>Host city</span><strong>(.*?)</strong>', section, re.S)
    host = plain(host_match.group(1)) if host_match else ''
    winners = re.findall(r'<li><strong><a href="/country/[^\"]+">(.*?)</a></strong>\s*—\s*(.*?),\s*<em>(.*?)</em></li>', section, re.S)
    if year == 2020:
        if winners:
            raise ValueError('Cancelled 2020 must not have a winner')
        return ('Eurovision 2020: Songs & Artists (Cancelled Contest)',
                'Eurovision 2020 was cancelled. Explore the selected countries, artists and songs from the contest that never took place.')
    if year == 1956:
        return ('Eurovision 1956 Results & Winner',
                'Explore Eurovision 1956 results and the winning song. Only the winner was officially announced; other rankings and full voting figures are unavailable.')
    if year == 1969:
        if len(winners) != 4:
            raise ValueError(f'Expected four joint winners in 1969, found {len(winners)}')
        return ('Eurovision 1969 Results & Four Joint Winners',
                'Explore Eurovision 1969 results and its four joint winners, with participating countries, artists and songs.')
    if len(winners) == 1:
        country, artist, song = (plain(x) for x in winners[0])
        title = f'Eurovision {year} Results, Winner & Voting'
        place = f' in {host}' if host else ''
        description = (f'Eurovision {year} results{place}: {country} won with {song} by {artist}. '
                       'Explore the final scoreboard, songs and voting results.')
    elif not winners:
        title = f'Eurovision {year} Results, Songs & Voting'
        description = (f'Explore Eurovision {year}' + (f' in {host}' if host else '') +
                       ': participating countries, artists, songs and available results.')
    else:
        raise ValueError(f'Unexpected {len(winners)} winners for {year}')
    return title, description


def replace_head(source, title, description, expected_canonical):
    head = one(r'<head\b[^>]*>(.*?)</head>', source, 'head')
    inner = head.group(1)
    one(r'<link\s+rel="canonical"\s+href="'+re.escape(expected_canonical)+r'"\s*/?>', inner, 'canonical')
    one(r'<meta\s+name="robots"\s+content="index,follow"\s*/?>', inner, 'robots')
    one(r'<title>.*?</title>', inner, 'title')
    one(r'<meta\s+name="description"\s+content="[^"]*"\s*/?>', inner, 'description')
    inner = re.sub(r'<title>.*?</title>', lambda _: '<title>'+html.escape(title)+'</title>', inner, count=1, flags=re.I|re.S)
    inner = re.sub(r'<meta\s+name="description"\s+content="[^"]*"\s*/?>',
                   lambda _: '<meta name="description" content="'+html.escape(description, quote=True)+'">',
                   inner, count=1, flags=re.I|re.S)
    return source[:head.start(1)] + inner + source[head.end(1):]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default='.', help='Repository root containing country/ and edition/')
    ap.add_argument('--output', default='stage3-metadata-artifact')
    args = ap.parse_args()
    source, output = Path(args.source), Path(args.output)
    if source.resolve() == output.resolve():
        raise SystemExit('Source and output must differ')
    countries = sorted((source/'country').glob('*.html'))
    editions = sorted((source/'edition').glob('*.html'))
    if len(countries) != COUNTRY_COUNT or len(editions) != EDITION_COUNT:
        raise SystemExit(f'Expected {COUNTRY_COUNT} countries and {EDITION_COUNT} editions; got {len(countries)} and {len(editions)}. Refusing partial output.')
    report = []
    for kind, paths in [('country', countries), ('edition', editions)]:
        for path in paths:
            source_html = path.read_text(encoding='utf-8')
            if kind == 'edition':
                year = int(path.stem)
                if year not in range(1956, 2027):
                    raise ValueError(f'Unexpected edition: {path}')
                title, description = edition_metadata(source_html, year)
            else:
                title, description = country_metadata(source_html, path.stem)
            canonical = f'https://douzepoints.org/{kind}/{path.name}'
            result = replace_head(source_html, title, description, canonical)
            target = output/kind/path.name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(result, encoding='utf-8')
            report.append((kind, path.name, title, description, len(title), len(description)))
    with (output/'metadata-report.csv').open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['type','filename','title','description','title_chars','description_chars'])
        w.writerows(report)
    print(f'Generated {len(report)} metadata-only pages in {output}')

if __name__ == '__main__':
    main()
