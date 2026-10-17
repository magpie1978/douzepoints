#!/usr/bin/env python3
"""Generate Option 4 production-ready edition pages into an artifact only.
Requires generate_edition_seo.py and SUPABASE_ANON_KEY. Does not deploy.
"""
import html
import json
import re
import sys
from pathlib import Path
import edition_option4_base as original

OUT = Path('edition-option4-artifact')
YEARS = range(1956, 2027)

def esc(value):
    return html.escape(original.clean(value), quote=True)

def link_country(row):
    name = original.clean(row.get('Country'))
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return f'<a href="/country/{slug}.html">{esc(name)}</a>' if slug else esc(name)

def panel(kicker, heading, contents, heading_tag='h2'):
    return (f'<div class="seo-edition-panel"><div class="seo-edition-heading">'
            f'<span class="seo-kicker">{esc(kicker)}</span>'
            f'<{heading_tag}>{esc(heading)}</{heading_tag}></div>{contents}</div>')

def render(rows, year):
    page = original.build_page(rows, year)
    start = page.index('      <section class="seo-edition">')
    end = page.index('      </section>', start) + len('      </section>')
    host = original.clean(rows[0].get('Location')) if rows else ''
    finalists = [r for r in rows if original.number(r.get('Final_Rank')) is not None]
    winners = [r for r in finalists if original.number(r.get('Final_Rank')) == 1]
    stats = [('Participating entries',len(rows))]
    if year != 2020:
        stats.append(('Grand finalists', len(finalists)))
    if host:
        stats.append(('Host city', host))
    cards = ''.join('<div class="seo-edition-stat"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>' for label,value in stats)
    if year == 2020:
        intro = ('The Eurovision Song Contest 2020 was cancelled due to the COVID-19 pandemic. '
                 'Explore the selected artists and songs. No competitive final, rankings or voting results took place.')
        title = 'Eurovision 2020 Songs & Artists'
    else:
        intro = f'Explore the Eurovision Song Contest {year}' + (f' in {esc(host)}' if host else '') + '. Browse the results, participating countries, artists and songs.'
        title = f'Eurovision {year} Results & Songs'
        if year == 1956:
            intro += ' Only the winning song was officially announced; the other placements and full voting figures are unavailable.'
        if year == 1969:
            intro += ' The contest had four joint winners.'
    blocks = [panel('EDITION HISTORY', title, f'<p>{intro}</p><div class="seo-edition-stats">{cards}</div>', 'h1')]
    if winners and year != 2020:
        if year == 1969:
            winners_text = '<p>Four joint winners:</p><ul class="seo-edition-winner-list">' + ''.join(
                f'<li><strong>{link_country(r)}</strong> — {esc(r.get("Artist"))}, <em>{esc(r.get("Song"))}</em></li>'
                for r in sorted(winners,key=lambda r: original.clean(r.get('Country')))) + '</ul>'
        else:
            winners_text = '<ul class="seo-edition-winner-list">' + ''.join(
                f'<li><strong>{link_country(r)}</strong> — {esc(r.get("Artist"))}, <em>{esc(r.get("Song"))}</em></li>'
                for r in winners) + '</ul>'
        blocks.append(panel('WINNING ENTRY' if len(winners)==1 else 'JOINT WINNERS',
                            f'Eurovision {year} winner' if len(winners)==1 else f'Eurovision {year} winners', winners_text))
    if year != 2020:
        results_heading = f'Eurovision {year} Results' if year == 1956 else f'Eurovision {year} Final Scoreboard'
        blocks.append(panel('GRAND FINAL', results_heading,
                            f'<div class="seo-results-scroll">{original.build_table(rows,year)}</div>'))
    entry_list = original.build_entries(rows)
    blocks.append(panel('ALL ENTRIES', 'Participating Countries, Artists & Songs',
                        f'<details class="seo-participants"><summary>Show all {len(rows)} entries</summary>'
                        f'<div class="seo-entries">{entry_list}</div></details>'))
    # Navigation stays crawlable without relying on client-side JavaScript.
    links = []
    if year > 1956:
        links.append(f'<a href="/edition/{year-1}.html">← Eurovision {year-1}</a>')
    if year < 2026:
        links.append(f'<a href="/edition/{year+1}.html">Eurovision {year+1} →</a>')
    blocks.append(panel('EXPLORE THE ARCHIVE', 'Other Eurovision editions',
                        '<nav class="seo-edition-year-nav" aria-label="Other Eurovision editions">'+' '.join(links)+'</nav>'))
    replacement = ('      <section class="seo-edition" aria-label="Eurovision '+str(year)+' edition history">\n'
                   + '\n'.join(blocks) + '\n      </section>')
    page = page[:start] + replacement + page[end:]
    css = '''
    /* Option 4: SEO section only; leave gallery, banner and sidebar unchanged. */
    .seo-edition .seo-edition-panel { background:#1b1d23; border:1px solid #34363c; border-radius:16px; padding:clamp(18px,2.6vw,28px); margin-bottom:22px; }
    .seo-edition .seo-edition-heading { border-left:4px solid #e50914; padding-left:16px; margin-bottom:22px; }
    .seo-edition .seo-edition-heading h1,.seo-edition .seo-edition-heading h2 { margin:0; }
    .seo-edition .seo-kicker { display:block; font-size:11px; letter-spacing:.12em; color:#bcbcbc; margin-bottom:6px; font-weight:700; }
    .seo-edition .seo-edition-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:22px; }
    .seo-edition .seo-edition-stat { background:#292b30; border:1px solid #393b42; border-radius:10px; padding:15px; min-width:0; }
    .seo-edition .seo-edition-stat span { display:block; color:#bcbcbc; font-size:12px; margin-bottom:8px; }
    .seo-edition .seo-edition-stat strong { display:block; color:#fff; font-size:20px; overflow-wrap:anywhere; }
    .seo-edition a { color:#ff6b73; }
    .seo-edition .seo-participants { margin-top:0; border:0; padding:0; }
    .seo-edition .seo-results-scroll th { background:#292b30; }
    .seo-edition .seo-edition-year-nav { display:flex; flex-wrap:wrap; gap:18px; }
    .seo-edition .seo-edition-winner-list { line-height:1.8; padding-left:22px; }
    @media(max-width:700px) { .seo-edition .seo-edition-stats { grid-template-columns:1fr 1fr; } .seo-edition .seo-edition-panel { padding:18px 14px; } }
    @media(max-width:420px) { .seo-edition .seo-edition-stats { grid-template-columns:1fr; } }
    '''
    page = page.replace('  </style>',css+'\n  </style>',1)
    return page

def main():
    (OUT/'edition').mkdir(parents=True,exist_ok=True)
    reports=[]
    for year in YEARS:
        try:
            rows=original.fetch_entries(year)
            report=original.validate(rows,year)
            if not report['passed']:
                raise ValueError('; '.join(report['issues']))
            content=render(rows,year)
            path=OUT/'edition'/f'{year}.html'
            path.write_text(content,encoding='utf-8')
            print(f'Generated {path}')
            reports.append({'year':year,'passed':True,'entries':len(rows)})
        except Exception as e:
            print(f'ERROR {year}: {e}',file=sys.stderr)
            reports.append({'year':year,'passed':False,'error':str(e)})
    (OUT/'report.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
    failures=[r for r in reports if not r['passed']]
    if failures:
        print(f'{len(failures)} editions failed; artifact is INCOMPLETE and must not be deployed.',file=sys.stderr)
        return 1
    print('All 71 edition pages generated and validated.')
    return 0

if __name__=='__main__':
    sys.exit(main())
