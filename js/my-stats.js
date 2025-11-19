// =============================================================
// my-stats.js  —  Watch History + Stats Dashboard
// =============================================================

const supabase = window.supabaseClient;

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------

function formatWatchTime(seconds) {
  if (!seconds || seconds <= 0) return "0m 0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// -------------------------------------------------------------
// LOAD STATS (TOP BOXES)
// -------------------------------------------------------------
async function loadSummary() {
  const totalVideosEl = document.getElementById("total-videos-watched");
  const totalViewsEl = document.getElementById("total-views");
  const totalWatchEl = document.getElementById("total-watch-time");

  const { data, error } = await supabase
    .from("view_watch_history_summary")
    .select("*")
    .single();

  if (error) {
    console.error("Error loading summary:", error);
    return;
  }

  totalVideosEl.textContent = data.total_videos || 0;
  totalViewsEl.textContent = data.total_views || 0;
  totalWatchEl.textContent = formatWatchTime(data.total_watch_time || 0);
}

// -------------------------------------------------------------
// LOAD WATCH HISTORY TABLE
// -------------------------------------------------------------
async function loadWatchHistory() {
  const tbody = document.getElementById("wh-tbody");

  const { data, error } = await supabase
    .from("view_watch_history")
    .select("*")
    .order("last_watched", { ascending: false });

  if (error) {
    console.error("Error loading watch history:", error);
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7" style="text-align:center; padding:20px;">
        No watch history yet.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.video_lookup}</td>
      <td>${row.view_count}</td>
      <td>${formatWatchTime(row.total_watch_time)}</td>
      <td>${formatDate(row.last_watched)}</td>
    `;

    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// SORTING
// -------------------------------------------------------------
let currentSort = { column: null, direction: 1 };

function sortTable(column) {
  const table = document.getElementById("wh-table");
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  // Determine direction
  if (currentSort.column === column) {
    currentSort.direction *=  -1;
  } else {
    currentSort.column = column;
    currentSort.direction = 1;
  }

  // Clear sort indicators
  document.querySelectorAll("#wh-table th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  // Add indicator to selected
  const th = document.querySelector(`#wh-table th[data-sort="${column}"]`);
  if (th) th.classList.add(currentSort.direction === 1 ? "sort-asc" : "sort-desc");

  rows.sort((a, b) => {
    const A = a.children[getColumnIndex(column)].innerText.trim();
    const B = b.children[getColumnIndex(column)].innerText.trim();

    // Numeric?
    if (!isNaN(A) && !isNaN(B)) {
      return (Number(A) - Number(B)) * currentSort.direction;
    }

    // Date?
    if (column === "lastwatched") {
      return (
        new Date(A).getTime() - new Date(B).getTime()
      ) * currentSort.direction;
    }

    // Default string
    return A.localeCompare(B) * currentSort.direction;
  });

  tbody.innerHTML = "";
  rows.forEach((r) => tbody.appendChild(r));
}

function getColumnIndex(column) {
  switch (column) {
    case "video": return 0;
    case "views": return 1;
    case "watchtime": return 2;
    case "lastwatched": return 3;
    default: return 0;
  }
}

// -------------------------------------------------------------
// AUTO-POSITION STAT BOXES OVER RED DIVIDER
// -------------------------------------------------------------
function autoPositionStats() {
  const panel = document.querySelector(".wh-summary-panel");
  const divider = document.querySelector(".banner-divider");

  if (!panel || !divider) return;

  const dividerBox = divider.getBoundingClientRect();
  const panelBox = panel.getBoundingClientRect();

  const dividerCenter = dividerBox.top + dividerBox.height / 2;
  const panelCenter = panelBox.top + panelBox.height / 2;

  const offset = dividerCenter - panelCenter;

  panel.style.transform = `translateY(${offset}px)`;
}

function waitForBannerImage() {
  const img = document.querySelector(".banner-static img");
  if (img) img.addEventListener("load", autoPositionStats);
}

// -------------------------------------------------------------
// INITIALIZE
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadSummary();
  loadWatchHistory();

  // Sorting
  document.querySelectorAll("#wh-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => sortTable(th.dataset.sort));
  });
});

// After header + banner loads
document.addEventListener("header-ready", () => {
  waitForBannerImage();
  autoPositionStats();
});

// Reposition on resize
window.addEventListener("resize", autoPositionStats);
// Reposition after full load
window.addEventListener("load", autoPositionStats);
