import { supabase } from "./supabaseClient.js";

/* -----------------------------------------------------------
   Utility — Format duration (seconds → Xm Ys)
------------------------------------------------------------ */
function formatDuration(sec) {
  sec = Number(sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/* -----------------------------------------------------------
   Utility — Format timestamp
------------------------------------------------------------ */
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* -----------------------------------------------------------
   Load aggregated watch stats from your Supabase view
------------------------------------------------------------ */
let tableData = [];

async function loadStats() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const { data: rows, error } = await supabase
    .from("view_watch_history")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error loading stats:", error);
    return;
  }

  tableData = rows;
  renderSummary(rows);
  renderTable(rows);
}

/* -----------------------------------------------------------
   Summary panel values
------------------------------------------------------------ */
function renderSummary(rows) {
  const totalVideos = rows.length;
  const totalViews = rows.reduce((sum, r) => sum + r.views, 0);
  const totalWatchSeconds = rows.reduce(
    (sum, r) => sum + r.total_watch_seconds,
    0
  );

  document.getElementById("total-videos-watched").textContent = totalVideos;
  document.getElementById("total-views").textContent = totalViews;
  document.getElementById("total-watch-time").textContent =
    formatDuration(totalWatchSeconds);
}

/* -----------------------------------------------------------
   Render table rows
------------------------------------------------------------ */
function renderTable(rows) {
  const tbody = document.querySelector("#watch-table tbody");
  tbody.innerHTML = "";

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td>${escapeHTML(row.video_title)}</td>
    <td>${row.view_count}</td>
    <td>${formatWatchTime(row.total_watch_time)}</td>
    <td>${formatDate(row.last_watched)}</td>
`;
    tbody.appendChild(tr);
  });
}

/* -----------------------------------------------------------
   Sorting functionality
------------------------------------------------------------ */
function sortTable(sortKey) {
  let sorted = [...tableData];

  const compareText = (a, b, field) =>
    (a[field] || "").localeCompare(b[field] || "");

  switch (sortKey) {
    case "video":
      sorted.sort((a, b) => compareText(a, b, "video_lookup"));
      break;
    case "artist":
      sorted.sort((a, b) => compareText(a, b, "Artist"));
      break;
    case "song":
      sorted.sort((a, b) => compareText(a, b, "Song"));
      break;
    case "country":
      sorted.sort((a, b) => compareText(a, b, "Country"));
      break;
    case "views":
      sorted.sort((a, b) => b.views - a.views);
      break;
    case "watch":
      sorted.sort((a, b) => b.total_watch_seconds - a.total_watch_seconds);
      break;
    case "last":
      sorted.sort(
        (a, b) =>
          new Date(b.last_watched_at) - new Date(a.last_watched_at)
      );
      break;
  }

  renderTable(sorted);
}

/* -----------------------------------------------------------
   Auto-position stats panel exactly on the red divider line
------------------------------------------------------------ */
function autoPositionStats() {
  const divider = document.querySelector(".banner-divider");
  const panel = document.querySelector(".wh-summary-panel");

  if (!divider || !panel) return;

  const rect = divider.getBoundingClientRect();

  // divider center in document space
  const dividerCenter =
    rect.top + window.scrollY + rect.height / 2;

  const panelHeight = panel.offsetHeight;
  const panelCenterOffset = panelHeight / 2;

  // anchor center of panel to center of divider
  panel.style.top = dividerCenter - panelCenterOffset + "px";

  // push table down automatically based on the real panel height
  const table = document.querySelector(".wh-table");
  const panelBottom =
    dividerCenter - panelCenterOffset + panelHeight;

  const offset = panelBottom + 40; // padding below boxes
  document.documentElement.style.setProperty(
    "--table-offset",
    offset + "px"
  );
}

/* -----------------------------------------------------------
   Init
------------------------------------------------------------ */
function waitForBannerImage() {
  const img = document.querySelector(".banner-static img");
  if (img) {
    img.addEventListener("load", autoPositionStats);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadStats();

  document.querySelectorAll(".sortable").forEach((th) => {
    th.addEventListener("click", () => {
      sortTable(th.dataset.sort);
    });
  });
});

/* Reposition when header loads the banner */
document.addEventListener("header-ready", () => {
  waitForBannerImage();
  autoPositionStats();
});

/* Also reposition on load and resize */
window.addEventListener("load", autoPositionStats);
window.addEventListener("resize", autoPositionStats);
