/*
 * sorting.js
 * Sorts video cards and updates the score circles based on the selected option.
 *
 * Expected <select id="sort-options"> values:
 *   - "jury"      -> sort by jury points (desc)
 *   - "televote"  -> sort by televote points (desc)
 *   - "total"     -> sort by total points (desc)
 *   - "year-asc"  -> year ascending
 *   - "year-desc" -> year descending
 *   - "artist"    -> artist A–Z
 *   - "song"      -> song A–Z
 *   - "country"   -> country A–Z
 */

(function () {

  // ------------------------------------------------------------
  // Comparator Factory
  // ------------------------------------------------------------
  function comparatorFactory(sortType) {
    const num = (el, key) => Number(el.dataset[key] || 0);
    const txt = (el, key) => (el.dataset[key] || "").toString();

    switch (sortType) {
      case "jury":
        return (a, b) => num(b, "jury") - num(a, "jury");

      case "televote":
        return (a, b) => num(b, "televote") - num(a, "televote");

      case "total":
        return (a, b) => num(b, "total") - num(a, "total");

      case "year-asc":
        return (a, b) => num(a, "year") - num(b, "year");

      case "year-desc":
        return (a, b) => num(b, "year") - num(a, "year");

      case "artist":
        return (a, b) => txt(a, "artist").localeCompare(txt(b, "artist"));

      case "song":
        return (a, b) => txt(a, "song").localeCompare(txt(b, "song"));

      case "country":
        return (a, b) => txt(b, "country").localeCompare(txt(a, "country"));

      default:
        return (a, b) => txt(a, "country").localeCompare(txt(b, "country"));
    }
  }

  // ------------------------------------------------------------
  // Update Score Display (Pos/Pts circles)
  // ------------------------------------------------------------
  function updateScoreDisplay(sortType) {
    const container = document.getElementById("video-container");
    if (!container) return;

    const useJury = sortType === "jury";
    const useTelevote = sortType === "televote";

    Array.from(container.children).forEach(item => {
      const dnq = item.dataset.dnq === "1";
      const pos = item.querySelector(".score-pos");
      const pts = item.querySelector(".score-pts");
      if (!pos || !pts) return;

      if (dnq) {
        pos.textContent = "NQ";
        pts.textContent = "NQ";
        return;
      }

      if (useJury) {
        pos.textContent = item.dataset.juryrank || "";
        pts.textContent = item.dataset.jury || "0";
      } else if (useTelevote) {
        pos.textContent = item.dataset.televoterank || "";
        pts.textContent = item.dataset.televote || "0";
      } else {
        pos.textContent = item.dataset.totalrank || "";
        pts.textContent = item.dataset.total || "0";
      }
    });
  }

  // ------------------------------------------------------------
  // Attach Sorting to Dropdown
  // ------------------------------------------------------------
  function attachSorting() {
    const select = document.getElementById("sort-options");
    const container = document.getElementById("video-container");
    if (!select || !container) return;

    select.addEventListener("change", () => {
      const sortType = select.value || "total";

      const items = Array.from(container.children);
      items.sort(comparatorFactory(sortType));

      const frag = document.createDocumentFragment();
      items.forEach(el => frag.appendChild(el));

      container.innerHTML = "";
      container.appendChild(frag);

      updateScoreDisplay(sortType);
    });
  }

  // ------------------------------------------------------------
  // Page-specific Initial Sort
  // ------------------------------------------------------------
  function triggerInitialSort() {
    const select = document.getElementById("sort-options");
    if (!select) return;

    const path = window.location.pathname || "";

    let defaultSort = "total"; // fallback

    // ⭐ Page-specific defaults
    if (path.includes("edition.html")) {
      defaultSort = "country";       // Country (A–Z)
    } else if (path.includes("country.html")) {
      defaultSort = "year-desc";     // Year (DESC)
    } else if (path.includes("winners.html")) {
      defaultSort = "year-asc";      // Year (ASC)
    }

    // Apply the default
    select.value = defaultSort;

    // Trigger sorting
    select.dispatchEvent(new Event("change"));
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", attachSorting);
  window.triggerInitialSort = triggerInitialSort;

})();
