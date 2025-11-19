import { supabase } from "./supabaseClient.js";

// Utility: format seconds into "Xm Ys"
function formatDuration(sec) {
  sec = Number(sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

// Utility: format timestamp
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let tableData = []; // store raw rows for sorting

async function loadWatchHistory() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  // 1. Fetch aggregated per-video stats
  const { data: rows, error } = await supabase
    .from("view_watch_history")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load watch stats:", error);
    return;
  }

  tableData = rows;
  renderTable(rows);
  updateSummaryPanel(rows);
}

function updateSummaryPanel(rows) {
  let totalVideos = rows.length;
  let totalViews = rows.reduce((sum, r) => sum + r.views, 0);
  let totalWatchSeconds = rows.reduce((sum, r) => sum + r.total_watch_seconds, 0);

  document.getElementById("total-videos-watched").textContent = totalVideos;
  document.getElementById("total-views").textContent = totalViews;
  document.getElementById("total-watch-time").textContent = formatDuration(totalWatchSeconds);
}

function renderTable(rows) {
  const tbody = document.querySelector("#watch-table tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.video_lookup}</td>
      <td>${r.Artist || ""}</td>
      <td>${r.Song || ""}</td>
      <td>${r.Country || ""}</td>
      <td>${r.views}</td>
      <td>${formatDuration(r.total_watch_seconds)}</td>
      <td>${formatDate(r.last_watched_at)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---- SORTING LOGIC ---- //
function sortTable(sortKey, rows) {
  let sorted = [...rows];

  switch (sortKey) {
    case "video":
      sorted.sort((a, b) => a.video_lookup.localeCompare(b.video_lookup));
      break;
    case "artist":
      sorted.sort((a, b) => (a.Artist || "").localeCompare(b.Artist || ""));
      break;
    case "song":
      sorted.sort((a, b) => (a.Song || "").localeCompare(b.Song || ""));
      break;
    case "country":
      sorted.sort((a, b) => (a.Country || "").localeCompare(b.Country || ""));
      break;
    case "views":
      sorted.sort((a, b) => b.views - a.views);
      break;
    case "watch":
      sorted.sort((a, b) => b.total_watch_seconds - a.total_watch_seconds);
      break;
    case "last":
      sorted.sort((a, b) => new Date(b.last_watched_at) - new Date(a.last_watched_at));
      break;
  }

  renderTable(sorted);
}

document.addEventListener("DOMContentLoaded", () => {
  loadWatchHistory();

  // Attach sorting events
  document.querySelectorAll(".sortable").forEach(th => {
    th.addEventListener("click", () => {
      const sortKey = th.dataset.sort;
      sortTable(sortKey, tableData);
    });
  });
});

/* -----------------------------------------------------------
   ALIGN SUMMARY PANEL EXACTLY TO THE RED DIVIDER LINE
------------------------------------------------------------ */

function alignSummaryToDivider() {
  const divider = document.querySelector(".banner-divider");
  const panel = document.querySelector(".wh-summary-panel");

  if (!divider || !panel) return;

  // Divider position
  const rect = divider.getBoundingClientRect();
  const dividerCenterY = rect.top + rect.height / 2 + window.scrollY;

  // Panel height
  const panelHeight = panel.offsetHeight;
  const panelCenterOffset = panelHeight / 2;

  // FINAL: place the panel so its centre = divider's centre
  panel.style.top = (dividerCenterY - panelCenterOffset) + "px";
}

// Run after content & header load
window.addEventListener("load", alignSummaryToDivider);
window.addEventListener("resize", alignSummaryToDivider);

