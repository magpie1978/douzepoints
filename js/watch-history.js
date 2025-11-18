import { supabase } from "./supabaseClient.js";

/* ---------------------------------------------------------
   Fetch & Render Watch History
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", loadWatchHistory);

async function loadWatchHistory() {
  const tableBody = document.querySelector("#watch-table tbody");
  if (!tableBody) return;

  // Ensure logged in
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) {
    tableBody.innerHTML = `<tr><td colspan="6" style="padding:20px;">Please log in.</td></tr>`;
    return;
  }

  // 1. Fetch aggregated watch stats
  const { data: stats, error: statsErr } = await supabase
    .from("user_video_stats")
    .select("*")
    .eq("user_id", user.id);

  if (statsErr || !stats?.length) {
    tableBody.innerHTML = `<tr><td colspan="6" style="padding:20px;">No watch history yet.</td></tr>`;
    return;
  }

  // 2. Fetch video metadata so we can show artist/song/country
  const videoLookupValues = stats.map(r => r.video_lookup);

  const { data: videos, error: videoErr } = await supabase
    .from("douzepoints")
    .select("*")
    .in("Video_Lookup", videoLookupValues);

  const videoMap = new Map();
  if (!videoErr && videos) {
    videos.forEach(v => videoMap.set(v.Video_Lookup, v));
  }

  // 3. Render table rows
  tableBody.innerHTML = "";

  stats.forEach(row => {
    const meta = videoMap.get(row.video_lookup) || {};

    const minutes = Math.floor(row.total_seconds / 60);
    const seconds = row.total_seconds % 60;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${meta.Video_Lookup || row.video_lookup}</td>
      <td>${meta.Artist || "-"}</td>
      <td>${meta.Song || "-"}</td>
      <td>${meta.Country || "-"}</td>
      <td>${row.view_count}</td>
      <td>${minutes}m ${seconds}s</td>
    `;

    tableBody.appendChild(tr);
  });
}
