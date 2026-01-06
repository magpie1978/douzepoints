// =============================================================
// my-stats.js — Watch History & User Stats Dashboard
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

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// -------------------------------------------------------------
// LOAD SUMMARY STATS (TOP BOXES)
// -------------------------------------------------------------
async function loadSummary() {
  const totalVideosEl = document.getElementById("total-videos-watched");
  const totalViewsEl = document.getElementById("total-views");
  const totalWatchEl = document.getElementById("total-watch-time");

  const { data, error } = await supabase
    .from("view_watch_history_summary")
    .select("*")
    .single();

  if (error || !data) return;

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
    .order("last_watched_at", { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `
      <tr><td colspan="7" style="text-align:center;padding:20px;">
        Error loading data.
      </td></tr>`;
    return;
  }

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7" style="text-align:center;padding:20px;">
        No watch history yet.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.Song || "(Unknown Song)"}</td>
      <td>${row.Artist || "(Unknown Artist)"}</td>
      <td>${row.Country || ""}</td>
      <td>${row.views}</td>
      <td>${formatWatchTime(row.total_watch_seconds)}</td>
      <td>${formatDate(row.last_watched_at)}</td>
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

  // Toggle direction
  if (currentSort.column === column) {
    currentSort.direction *= -1;
  } else {
    currentSort.column = column;
    currentSort.direction = 1;
  }

  // Reset sort indicators
  document.querySelectorAll("#wh-table th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  const th = document.querySelector(`#wh-table th[data-sort="${column}"]`);
  if (th) th.classList.add(currentSort.direction === 1 ? "sort-asc" : "sort-desc");

  const colIndex = getColumnIndex(column);

  rows.sort((a, b) => {
    const A = a.children[colIndex].innerText.trim();
    const B = b.children[colIndex].innerText.trim();

    // Numeric sort
    if (!isNaN(A) && !isNaN(B) && A !== "" && B !== "") {
      return (Number(A) - Number(B)) * currentSort.direction;
    }

    // Date sort
    if (column === "lastwatched") {
      return (
        new Date(A).getTime() - new Date(B).getTime()
      ) * currentSort.direction;
    }

    // Default string sort
    return A.localeCompare(B) * currentSort.direction;
  });

  tbody.innerHTML = "";
  rows.forEach((r) => tbody.appendChild(r));
}

function getColumnIndex(column) {
  switch (column) {
    case "song":
      return 0;
    case "artist":
      return 1;
    case "country":
      return 2;
    case "views":
      return 3;
    case "watchtime":
      return 4;
    case "lastwatched":
      return 5;
    default:
      return 0;
  }
}

// -------------------------------------------------------------
// AUTO-POSITION STATS (centered on red divider)
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

function waitForBanner() {
  const img = document.querySelector(".banner-static img");
  if (img) img.addEventListener("load", autoPositionStats);
}



// -------------------------------------------------------------
// WATCH TRACKING
// -------------------------------------------------------------
function attachWatchTracking(videoEl, entry) {
  if (!videoEl || !entry?.Video_Lookup) return;

  const videoId = entry.Video_Lookup;
  let lastSavedSecond = 0;

  // Remove any previous handlers (IMPORTANT)
  videoEl.onplay = null;
  videoEl.ontimeupdate = null;
  videoEl.onended = null;

  videoEl.addEventListener("play", () => {
    // Optional: console.log("▶ play", videoId);
  });

  videoEl.addEventListener("timeupdate", async () => {
    if (!window.supabaseClient) return;

    const current = Math.floor(videoEl.currentTime);

    // Save every 10 seconds
    if (current - lastSavedSecond < 10) return;
    lastSavedSecond = current;

    const session = (await supabase.auth.getSession()).data.session;
    const user = session?.user;
    if (!user) return;

    await supabase
      .from("watch_history")
      .upsert({
        user_id: user.id,
        video_lookup: videoId,
        seconds_watched: current,
        updated_at: new Date().toISOString()
      });
  });

  videoEl.addEventListener("ended", async () => {
    const session = (await supabase.auth.getSession()).data.session;
    const user = session?.user;
    if (!user) return;

    await supabase
      .from("watch_history")
      .upsert({
        user_id: user.id,
        video_lookup: videoId,
        completed: true,
        updated_at: new Date().toISOString()
      });
  });
}







// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  loadSummary();
  loadWatchHistory();

  // Sorting handlers
  document.querySelectorAll("#wh-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => sortTable(th.dataset.sort));
  });
});

// Header loads banner dynamically → then align stats
document.addEventListener("header-ready", () => {
  waitForBanner();
  autoPositionStats();
});

// Reposition on resize / load
window.addEventListener("resize", autoPositionStats);
window.addEventListener("load", autoPositionStats);
