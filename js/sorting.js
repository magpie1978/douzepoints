/**
 * sorting.js
 * Handles dropdown sorting AND updates the score-table circles to show
 * Jury vs Total values depending on the selected option.
 *
 * Expected select#sort-options values (examples):
 *  - "jury"        -> sort by Jury points and display Jury Rank/Points in circles
 *  - "televote"    -> (optional) if you want to support televote display too
 *  - "total"       -> default (Total points + Total rank in circles)
 *  - Other values like "year-asc", "year-desc", "artist", "song", "country" only affect order,
 *                     circles remain on Total unless 'jury' (or 'televote') is selected.
 */

function comparatorFactory(sortType) {
  const num = (el, key) => Number(el.dataset[key] || 0);
  const txt = (el, key) => (el.dataset[key] || '').toString();

  switch (sortType) {
    case 'jury':
      return (a, b) => num(b, 'jury') - num(a, 'jury'); // desc
    case 'televote':
      return (a, b) => num(b, 'televote') - num(a, 'televote'); // desc
    case 'total':
      return (a, b) => num(b, 'total') - num(a, 'total'); // desc
    case 'year-asc':
      return (a, b) => (num(a, 'year') - num(b, 'year'));
    case 'year-desc':
      return (a, b) => (num(b, 'year') - num(a, 'year'));
    case 'artist':
      return (a, b) => txt(a, 'artist').localeCompare(txt(b, 'artist'));
    case 'song':
      return (a, b) => txt(a, 'song').localeCompare(txt(b, 'song'));
    case 'country':
      return (a, b) => txt(a, 'country').localeCompare(txt(b, 'country'));
    default:
      // Fallback to total desc
      return (a, b) => num(b, 'total') - num(a, 'total');
  }
}

function updateScoreDisplay(sortType) {
  const container = document.getElementById('video-container');
  if (!container) return;

  const useJury = (sortType === 'jury');
  const useTelevote = (sortType === 'televote'); // If you want televote display

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
      // Default to Total
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
    const sortType = select.value;
    const items = Array.from(container.children);
    items.sort(comparatorFactory(sortType));

    // Re-append in new order
    const frag = document.createDocumentFragment();
    items.forEach(el => frag.appendChild(el));
    container.innerHTML = '';
    container.appendChild(frag);

    // Update circles to the appropriate metric
    updateScoreDisplay(sortType);
  });
}

// Exposed so video.js can call after initial render
function triggerInitialSort() {
  const select = document.getElementById('sort-options');
  if (!select) return;

  // If nothing selected, default to "total" (or keep existing value)
  if (!select.value) select.value = 'total';

  // Fire once to sort and update circles
  const evt = new Event('change');
  select.dispatchEvent(evt);
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  attachSorting();
  // Do not call triggerInitialSort here, because video.js calls it AFTER rendering entries.
  // If your page renders entries server-side, you can uncomment the next line:
  // triggerInitialSort();
});

window.triggerInitialSort = triggerInitialSort;
