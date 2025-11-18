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
 *

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

    // Respect the default set in the HTML (Country A–Z)
    const sortType = select.value || 'country';
    select.value = sortType;

    const evt = new Event('change');
    select.dispatchEvent(evt);
}


  document.addEventListener('DOMContentLoaded', attachSorting);
  window.triggerInitialSort = triggerInitialSort;
})();
*/

/**
 * sorting.js – unified sorting logic for all pages
 *
 * Auto-defaults:
 *   • edition.html → Country (A–Z)
 *   • winners.html → Year (Ascending)
 *
 * All other pages use the default defined in HTML <select>.
 */

document.addEventListener("DOMContentLoaded", () => {
    setupSorting();
});

/* ---------------------------------------------------------
   MAIN SETUP
--------------------------------------------------------- */
function setupSorting() {
    const select = document.getElementById("sort-options");
    if (!select) return;

    // Attach handler
    select.addEventListener("change", handleSortChange);

    // Auto-select appropriate default
    applyPageDefaultSort();
}

/* ---------------------------------------------------------
   AUTO-DEFAULT SORT SELECTION BASED ON PAGE
--------------------------------------------------------- */
function applyPageDefaultSort() {
    const select = document.getElementById("sort-options");
    if (!select) return;

    const path = window.location.pathname.toLowerCase();

    let desiredDefault = null;

    if (path.includes("edition.html")) {
        desiredDefault = "country";           // COUNTRY (A–Z)
    }
    else if (path.includes("winners.html")) {
        desiredDefault = "year-asc";          // YEAR ASCENDING
    }

    // If there's a page-specific default, apply it AFTER videos load
    if (desiredDefault) {
        // Small delay ensures video cards exist first
        setTimeout(() => {
            select.value = desiredDefault;

            const evt = new Event("change");
            select.dispatchEvent(evt);
        }, 200);  // 200ms = enough for video.js to render
    }
    else {
        // fallback to default in HTML
        const evt = new Event("change");
        select.dispatchEvent(evt);
    }
}


/* ---------------------------------------------------------
   SORT HANDLER
--------------------------------------------------------- */
function handleSortChange() {
    const select = document.getElementById("sort-options");
    const sortType = select.value;

    const container = document.getElementById("video-grid") 
                    || document.getElementById("video-container");

    if (!container) return;

    const items = Array.from(container.querySelectorAll(".video-item"));
    if (items.length === 0) return;

    // Convert DOM items → sortable data
    const videos = items.map(item => ({
        element: item,
        Country: item.dataset.country || "",
        Artist: item.dataset.artist || "",
        Song: item.dataset.song || "",
        Year: parseInt(item.dataset.year || "0"),
        TotalPoints: parseInt(item.dataset.totalpoints || "0")
    }));

    // Apply sorting rules
    sortVideos(videos, sortType);

    // Re-render
    container.innerHTML = "";
    videos.forEach(v => container.appendChild(v.element));
}

/* ---------------------------------------------------------
   SORTING LOGIC
--------------------------------------------------------- */
function sortVideos(videos, sortType) {
    switch (sortType) {

        /* ---------------------------
           COUNTRY SORT
        --------------------------- */
        case "country": // Country (A–Z)
            videos.sort((a, b) =>
                (a.Country || "").toLowerCase()
                    .localeCompare((b.Country || "").toLowerCase())
            );
            break;

        case "country-desc": // Country (Z–A)
            videos.sort((a, b) =>
                (b.Country || "").toLowerCase()
                    .localeCompare((a.Country || "").toLowerCase())
            );
            break;

        /* ---------------------------
           ARTIST SORT
        --------------------------- */
        case "artist":
            videos.sort((a, b) =>
                (a.Artist || "").toLowerCase()
                    .localeCompare((b.Artist || "").toLowerCase())
            );
            break;

        case "artist-desc":
            videos.sort((a, b) =>
                (b.Artist || "").toLowerCase()
                    .localeCompare((a.Artist || "").toLowerCase())
            );
            break;

        /* ---------------------------
           YEAR SORT
        --------------------------- */
        case "year-asc":
            videos.sort((a, b) => (a.Year || 0) - (b.Year || 0));
            break;

        case "year-desc":
            videos.sort((a, b) => (b.Year || 0) - (a.Year || 0));
            break;

        /* ---------------------------
           TOTAL POINTS SORT
        --------------------------- */
        case "total":
            videos.sort((a, b) => (b.TotalPoints || 0) - (a.TotalPoints || 0));
            break;

        case "total-asc":
            videos.sort((a, b) => (a.TotalPoints || 0) - (b.TotalPoints || 0));
            break;

        /* ---------------------------
           DEFAULT – fallback
        --------------------------- */
        default:
            console.warn("Unknown sort type:", sortType);
            break;
    }
}

