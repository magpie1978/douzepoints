// =============================================================
// DEBUG MODE — my-stats.js
// This version prints EVERYTHING to console so we see the issue.
// =============================================================

const supabase = window.supabaseClient;

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function formatWatchTime(seconds) {
  if (!seconds || seconds <= 0) return "0m 0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

// -------------------------------------------------------------
// LOAD SUMMARY
// -------------------------------------------------------------
async function loadSummary() {
  console.log("🔵 Loading summary view…");

  const { data, error } = await supabase
    .from("view_watch_history")
    .select("*")
    .single();

  console.log("🟣 Summary returned:", { data, error });

  if (error || !data) return;

  document.getElementById("total-videos-watched").textContent =
    data.total_videos || 0;

  document.getElementById("total-views").textContent =
    data.total_views || 0;

  document.getElementById("total-watch-time").textContent =
    formatWatchTime(data.total_watch_time || 0);
}

// -------------------------------------------------------------
// LOAD WATCH HISTORY TABLE
// -------------------------------------------------------------
async function loadWatchHistory() {
  console.log("🔵 Loading watch history view…");

  const tbody = document.getElementById("wh-tbody");

  const { data, error } = await supabase
    .from("view_watch_history")
    .select("*")
    .order("last_watched", { ascending: false });

  console.log("🟣 Watch history returned:", { data, error });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4">Error loading data</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">⚠ No watch history found</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  data.forEach((row) => {
    console.log("➡ Row:", row);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.video_lookup ?? row.Video_Lookup ?? "(missing)"}</td>
      <td>${row.view_count ?? "(missing)"}</td>
      <td>${formatWatchTime(row.total_watch_time ?? 0)}</td>
      <td>${formatDate(row.last_watched)}</td>
    `;

    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// Sorting (unchanged)
// -------------------------------------------------------------
let currentSort = { column: null, direction: 1 };

function sortTable(column) {
  const table = document.getElementById("wh-table");
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  if (currentSort.column === column) {
    currentSort.direction *= -1;
  } else {
    currentSort.column = column;
    currentSort.direction = 1;
  }

  rows.sort((a, b) => {
    const A = a.children[getCol(column)].innerText.trim();
    const B = b.children[getCol(column)].innerText.trim();

    if (!isNaN(A) && !isNaN(B)) {
      return (Number(A) - Number(B)) * currentSort.direction;
    }

    return A.localeCompare(B) * currentSort.direction;
  });

  tbody.innerHTML = "";
  rows.forEach((r) => tbody.appendChild(r));
}

function getCol(c) {
  return { video: 0, views: 1, watchtime: 2, lastwatched: 3 }[c] || 0;
}

// -------------------------------------------------------------
// AUTO POSITION STATS
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
// INIT
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔵 DOMContentLoaded fired — loading both views");
  loadSummary();
  loadWatchHistory();

  document.querySelectorAll("#wh-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => sortTable(th.dataset.sort));
  });
});

document.addEventListener("header-ready", () => {
  waitForBannerImage();
  autoPositionStats();
});

window.addEventListener("load", autoPositionStats);
window.addEventListener("resize", autoPositionStats);
