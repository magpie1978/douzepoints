/**
 * sorting.js
 * Sorts video cards and updates the score-table circles based on the selected option.
 *
 * Expected <select id="sort-options"> values:
 *   - "jury"      -> use Final_JuryRank / Final_JuryPoints in circles, sort by jury points (desc)
 *   - "televote"  -> (optional) use Final_TelevoteRank / Final_TelevotePoints, sort by televote points (desc)
 *   - "total"     -> default; use Final_Rank / Final_TotalPoints, sort by total points (desc)
 *   - "year-asc"  -> sort by Year ascending
 *   - "year-desc" -> sort by Year descending
 *   - "artist"    -> sort by Artist (A→Z)
 *   - "song"      -> sort by Song (A→Z)
 *   - "country"   -> sort by Country (A→Z)
 */

(function () {
  function comparatorFactory(sortType) {
    const num = (el, key) => Number(el.dataset[key] || 0);
    const txt = (el, key) => (el.dataset[key] || '').toString();

    switch (sortType) {
      case 'jury':
        return (a, b) => num(b, 'jury') - num(a, 'jury');           // desc
      case 'televote':
        return (a, b) => num(b, 'televote') - num(a, 'televote');   // desc
      case 'total':
        return (a, b) => num(b, 'total') - num(a, 'total');         // desc
      case 'year-asc':
        return (a, b) => num(a, 'year') - num(b, 'year');
      case 'year-desc':
        return (a, b) => num(b, 'year') - num(a, 'year');
      case 'artist':
        return (a, b) => txt(a, 'artist').localeCompare(txt(b, 'artist'));
      case 'song':
        return (a, b) => txt(a, 'song').localeCompare(txt(b, 'song'));
      case 'country':
        return (a, b) => txt(a, 'country').localeCompare(txt(b, 'country'));
      default:
        return (a, b) => txt(a, 'country').localeCompare(txt(b, 'country'));
    }
  }

  function updateScoreDisplay(sortType) {
    const container = document.getElementById('video-container');
    if (!container) return;

    const useJury     = (sortType === 'jury');
    const useTelevote = (sortType === 'televote');

    Array.from(container.children).forEach(item => {
      const dnq  = item.dataset.dnq === '1';
      const pos  = item.querySelector('.score-pos');
      const pts  = item.querySelector('.score-pts');
      if (!pos || !pts) return;

      if (dnq) {
        pos.textContent = 'NQ';
        pts.textContent = 'NQ';
        return;
      }

      if (useJury) {
        pos.textContent = item.dataset.juryrank || '';
        pts.textContent = item.dataset.jury || '0';
      } else if (useTelevote) {
        pos.textContent = item.dataset.televoterank || '';
        pts.textContent = item.dataset.televote || '0';
      } else {
        pos.textContent = item.dataset.totalrank || '';
        pts.textContent = item.dataset.total || '0';
      }
    });
  }

  function attachSorting() {
    const select = document.getElementById('sort-options');
    const container = document.getElementById('video-container');
    if (!select || !container) return;

    select.addEventListener('change', () => {
      const sortType = select.value || 'total';
      const items = Array.from(container.children);
      items.sort(comparatorFactory(sortType));

      const frag = document.createDocumentFragment();
      items.forEach(el => frag.appendChild(el));
      container.innerHTML = '';
      container.appendChild(frag);

      updateScoreDisplay(sortType);
    });
  }

  // Exposed so video.js can call once entries are rendered
  function triggerInitialSort() {
    const select = document.getElementById('sort-options');
    if (!select) return;
    if (!select.value) select.value = 'total';
    const evt = new Event('change');
    select.dispatchEvent(evt);
  }

  document.addEventListener('DOMContentLoaded', attachSorting);
  window.triggerInitialSort = triggerInitialSort;
})();
