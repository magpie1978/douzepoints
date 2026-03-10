(function () {

  // ------------------------------------------------------------
  // Comparator Factory
  // ------------------------------------------------------------
  function comparatorFactory(sortType) {

    const num = (el, key) => Number(el.dataset[key] || 0);
    const txt = (el, key) => (el.dataset[key] || "").toString();

    switch (sortType) {

      case "place":
        return (a, b) => num(a, "place") - num(b, "place");

      case "running":
        return (a, b) => num(a, "running") - num(b, "running");

      case "artist":
        return (a, b) => txt(a, "artist").localeCompare(txt(b, "artist"));

      case "song":
        return (a, b) => txt(a, "song").localeCompare(txt(b, "song"));

      case "country":
        return (a, b) => txt(a, "country").localeCompare(txt(b, "country"));

      case "year-asc":
        return (a, b) => num(a, "year") - num(b, "year");

      case "year-desc":
        return (a, b) => num(b, "year") - num(a, "year");

      case "jury":
        return (a, b) => num(b, "jury") - num(a, "jury");

      case "televote":
        return (a, b) => num(b, "televote") - num(a, "televote");

      case "total":
        return (a, b) => num(b, "total") - num(a, "total");

      default:
        return () => 0;

    }
  }

  // ------------------------------------------------------------
  // Update Score Display (Eurovision only)
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
  // Attach Sorting
  // ------------------------------------------------------------

  function attachSorting() {
  
    const select = document.getElementById("sort-options");
    const container = document.getElementById("video-container");
  
    if (!select || !container) return;
  
    select.addEventListener("change", () => {
  
      const sortType = select.value;
  
      const items = Array.from(container.children);
  
      // FIRST positions
      const firstRects = new Map();
      items.forEach(el => {
        firstRects.set(el, el.getBoundingClientRect());
      });
  
      // Sort items
      items.sort(comparatorFactory(sortType));
  
      const frag = document.createDocumentFragment();
      items.forEach(el => frag.appendChild(el));
  
      container.innerHTML = "";
      container.appendChild(frag);
  
      // LAST positions + animation
      items.forEach((el, index) => {
  
        const first = firstRects.get(el);
        const last = el.getBoundingClientRect();
  
        if (!first) return;
  
        const dx = first.left - last.left;
        const dy = first.top - last.top;
  
        if (dx || dy) {
          // Initial inverted position + visual effect
          el.style.transform = `translate(${dx}px, ${dy}px) scale(0.96)`;
          el.style.opacity = "0.6";
  
          requestAnimationFrame(() => {
  
            el.style.transition =
        `transform 1000ms cubic-bezier(.2,.8,.2,1) ${index * 35}ms,
         opacity 300ms ease ${index * 35}ms`;

      el.style.transform = "";
      el.style.opacity = "1";
  
          });
  
        }
  
      });
  
      updateScoreDisplay(sortType);
  
    });
  
  }
  

  // ------------------------------------------------------------
  // Page-specific Default Sort
  // ------------------------------------------------------------
  function triggerInitialSort() {

    const select = document.getElementById("sort-options");
    if (!select) return;

    const path = window.location.pathname;

    let defaultSort = "place";

    if (path.includes("edition.html")) {
      defaultSort = "country";

    } else if (path.includes("country.html")) {
      defaultSort = "year-desc";

    } else if (path.includes("winners.html")) {
      defaultSort = "year-desc";

    } else if (path.includes("umk.html")) {
      defaultSort = "place";
    }

    select.value = defaultSort;
    select.dispatchEvent(new Event("change"));

  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", attachSorting);
  window.triggerInitialSort = triggerInitialSort;

})();
