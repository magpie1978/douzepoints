import { supabase } from "./supabaseClient.js";

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function renderUMKVideos(entries) {

  const container = document.getElementById("video-container");
  if (!container) return;

  container.innerHTML = "";

  if (!entries || entries.length === 0) {
    container.innerHTML = `<p style="padding:20px;">No UMK videos found.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();

  entries.forEach(entry => {

    const wrapper = document.createElement("div");
    wrapper.className = "video-item";

    const imageUrl = `images/umk/${entry.Year}-${entry.Running_Order}.jpg`;

    wrapper.innerHTML = `
      <div class="preview-container">
        <img class="thumbnail"
          src="${imageUrl}"
          alt="${escapeHTML(entry.Artist)}">
      </div>

      <div class="video-title-with-icon">
        <div style="display:flex;align-items:center;gap:10px;">

          <img class="flag-icon" src="/flags/fi.png">

          <div class="video-title-text">

            <div class="title-line">
              <div class="title-artist">${escapeHTML(entry.Artist)}</div>
              <div class="title-song">${escapeHTML(entry.Song)}</div>
            </div>

            <div class="title-meta">
              <span class="title-country">Finland</span>
              <span class="title-year">${entry.Year}</span>
            </div>

          </div>

        </div>

        <div class="score-wrapper">
          <table class="score-table">
            <tr>
              <th>R/O</th>
              <th>Place</th>
            </tr>
            <tr>
              <td><div class="score-circle">${entry.Running_Order}</div></td>
              <td><div class="score-circle">${entry.Place ?? "-"}</div></td>
            </tr>
          </table>
        </div>

      </div>
    `;

    const open = () => {
      if (window.openVideoModal) {
        window.openVideoModal({
          url: entry.Video_URL,
          entry: entry
        });
      }
    };

    wrapper.addEventListener("click", open);
    wrapper.querySelector(".thumbnail")?.addEventListener("click", open);

    frag.appendChild(wrapper);

  });

  container.appendChild(frag);
}

document.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);
  const year = Number(params.get("edition")) || 2026;

  console.log("Year being queried:", year);
  
  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("*")
    .eq("Contest","UMK")
    .eq("Year",year)
    .order("Running_Order",{ ascending:true });

  if (error) {
    console.error("UMK load error:", error);
    return;
  }

  console.log("UMK rows:", data);

  renderUMKVideos(data);

});
