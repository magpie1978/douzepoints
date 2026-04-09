import { applySorting } from "./sorting_core.js";

function comparator(type) {
  const num = (el, k) => Number(el.dataset[k] || 0);
  const txt = (el, k) => (el.dataset[k] || "");

  switch (type) {
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
    default:
      return () => 0;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("sort-options");
  const container = document.getElementById("video-container");

  function notifyCards(sortType) {
    container.querySelectorAll(".video-item").forEach(card => {
      card.dispatchEvent(
        new CustomEvent("edition-sort-changed", {
          detail: { sortType }
        })
      );
    });
  }

  function runSort() {
    const items = [...container.children];
    const sortType = select.value;

    applySorting(container, items, comparator(sortType));
    notifyCards(sortType);
  }

  select.addEventListener("change", runSort);
  window.triggerInitialSort = runSort;
});
