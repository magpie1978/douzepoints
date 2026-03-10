(function () {

  //------------------------------------------------------------
  // Comparator factory
  //------------------------------------------------------------
  function comparatorFactory(sortType) {

    const num = (el, key) => Number(el.dataset[key] || 0);
    const txt = (el, key) => (el.dataset[key] || "").toString();

    switch (sortType) {

      case "country":
        return (a, b) => txt(a, "country").localeCompare(txt(b, "country"));

      case "country-desc":
        return (a, b) => txt(b, "country").localeCompare(txt(a, "country"));

      case "artist":
        return (a, b) => txt(a, "artist").localeCompare(txt(b, "artist"));

      case "song":
        return (a, b) => txt(a, "song").localeCompare(txt(b, "song"));

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

      default:
        return () => 0;
    }

  }

  //------------------------------------------------------------
  // Update score display (Eurovision scoreboard circles)
  //------------------------------------------------------------
  function updateScoreDisplay(sortType) {

    const container = document.getElementById("video-container");
    if (!container) return;

    const useJury = sortType === "jury";
    const useTelevote = sortType === "televote";

    Array.from(container.children).forEach(item => {

      const pos = item.querySelector(".score-pos");
      const pts = item.querySelector(".score-pts");

      if (!pos || !pts) return;

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

  //------------------------------------------------------------
  // Sorting with Netflix-style FLIP animation
  //------------------------------------------------------------
  function attachSorting() {

    const select = document.getElementById("sort-options");
    const container = document.getElementById("video-container");

    if (!select || !container) return;

    select.addEventListener("change", () => {

      const sortType = select.value;
      const items = Array.from(container.children);

      // Record starting positions
      const firstRects = new Map();
      items.forEach(el => {
        firstRects.set(el, el.getBoundingClientRect());
      });

      // Sort elements
      items.sort(comparatorFactory(sortType));

      const frag = document.createDocumentFragment();
      items.forEach(el => frag.appendChild(el));

      container.innerHTML = "";
      container.appendChild(frag);

      // Animate movement
      items.forEach((el, index) => {

        const first = firstRects.get(el);
        const last = el.getBoundingClientRect();
        if (!first) return;

        const dx = first.left - last.left;
        const dy = first.top - last.top;

        if (dx || dy) {

          el.style.transform = `translate(${dx}px, ${dy}px) scale(.92)`;
          el.style.opacity = "0.7";
          el.style.zIndex = "20";
          el.style.boxShadow = "0 20px 40px rgba(0,0,0,0.55)";

          requestAnimationFrame(() => {

            el.style.transition =
              `transform 520ms cubic-bezier(.22,1,.36,1) ${index*50}ms,
               opacity 300ms ease ${index*50}ms,
               box-shadow 520ms ease ${index*50}ms`;

            el.style.transform = "";
            el.style.opacity = "1";
            el.style.boxShadow = "";
            el.style.zIndex = "";

          });

        }

      });

      updateScoreDisplay(sortType);

    });

  }

  //------------------------------------------------------------
  // Initial page sorting
  //------------------------------------------------------------
  function triggerInitialSort() {

    const select = document.getElementById("sort-options");
    if (!select) return;

    const path = window.location.pathname;

    let defaultSort = "country";

    if (path.includes("country.html"))
      defaultSort = "year-desc";

    if (path.includes("winners.html"))
      defaultSort = "year-desc";

    if (path.includes("fan-favorites.html"))
      defaultSort = "total";

    select.value = defaultSort;

    select.dispatchEvent(new Event("change"));

  }

  //------------------------------------------------------------
  // Init
  //------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", attachSorting);
  window.triggerInitialSort = triggerInitialSort;

})();
