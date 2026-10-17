#!/usr/bin/env python3
"""Safe 2023 edition redesign preview. Requires existing generate_edition_seo.py."""
import html
import json
from pathlib import Path
import generate_edition_seo as original

YEAR = 2023
DEST = Path('seo-preview/edition/2023-test.html')

def esc(value):
    return html.escape(original.clean(value), quote=True)

def country_link(row):
    country = original.clean(row.get('Country'))
    # Link only for known slug mapping; avoids inventing country paths.
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', country.lower()).strip('-')
    return f'<a href="/country/{slug}.html">{esc(country)}</a>' if slug else esc(country)

def render(rows):
    page = original.build_page(rows, YEAR)
    winners = [r for r in rows if original.number(r.get('Final_Rank')) == 1]
    winner = winners[0] if len(winners) == 1 else None
    finalists = [r for r in rows if original.number(r.get('Final_Rank')) is not None]
    host = original.clean(rows[0].get('Location')) if rows else ''
    metrics = [('Participating entries', len(rows)), ('Grand finalists', len(finalists))]
    if host:
        metrics.append(('Host city', host))
    stats = ''.join(f'<div class="seo-edition-stat"><span>{esc(label)}</span><strong>{esc(value)}</strong></div>' for label,value in metrics)
    intro_start = page.index('      <section class="seo-edition">')
    intro_end = page.index('      </section>',intro_start) + len('      </section>')
    scoreboard = original.build_table(rows, YEAR)
    if winner:
        spotlight = (f'<div class="seo-edition-panel"><div class="seo-edition-heading"><span class="seo-kicker">WINNING ENTRY</span>'
                     f'<h2>Eurovision {YEAR} winner</h2></div>'
                     f'<p class="seo-winner"><strong>{country_link(winner)}</strong> — {esc(winner.get("Artist"))}, '
                     f'<em>{esc(winner.get("Song"))}</em></p></div>')
    else:
        spotlight = ''
    rows_markup = original.build_entries(rows)
    new_section = f'''      <section class="seo-edition" aria-label="Eurovision {YEAR} edition history">
        <div class="seo-edition-panel">
          <div class="seo-edition-heading"><span class="seo-kicker">EDITION HISTORY</span><h1>Eurovision {YEAR} Results &amp; Songs</h1></div>
          <p>Explore the Eurovision Song Contest {YEAR}{' in ' + esc(host) if host else ''}. Browse the results, participating countries, artists and songs.</p>
          <div class="seo-edition-stats">{stats}</div>
        </div>
        {spotlight}
        <div class="seo-edition-panel">
          <div class="seo-edition-heading"><span class="seo-kicker">GRAND FINAL</span><h2>Eurovision {YEAR} Final Scoreboard</h2></div>
          <div class="seo-results-scroll">{scoreboard}</div>
        </div>
        <div class="seo-edition-panel">
          <div class="seo-edition-heading"><span class="seo-kicker">ALL ENTRIES</span><h2>Participating Countries, Artists &amp; Songs</h2></div>
          <details class="seo-participants"><summary>Show all {len(rows)} entries</summary><div class="seo-entries">{rows_markup}</div></details>
        </div>
      </section>'''
    page = page[:intro_start] + new_section + page[intro_end:]
    css = '''
    /* Option 4 edition redesign: confined to the SEO section */
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
    @media(max-width:700px) { .seo-edition .seo-edition-stats { grid-template-columns:1fr 1fr; } .seo-edition .seo-edition-panel { padding:18px 14px; } }
    @media(max-width:420px) { .seo-edition .seo-edition-stats { grid-template-columns:1fr; } }
    '''
    page = page.replace('  </style>', css + '\n  </style>', 1)
    # Test preview should never compete with canonical production URL in search.
    page = page.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,follow">', 1)
    return page

def main():
    rows = original.fetch_entries(YEAR)
    report = original.validate(rows, YEAR)
    if not report['passed']:
        raise RuntimeError(f'2023 validation failed: {report["issues"]}')
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(render(rows),encoding='utf-8')
    print(f'Created {DEST} ({len(rows)} entries)')

if __name__ == '__main__':
    main()
