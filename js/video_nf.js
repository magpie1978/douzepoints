import { supabase } from "./supabaseClient.js";

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

/* -------------------------------------------------- */
/* Contest → country flag mapping                     */
/* -------------------------------------------------- */

const contestFlags = {
  "UMK": "fi",
  "Eesti Laul": "ee"
};

/* -------------------------------------------------- */
/* Render videos                                      */
/* -------------------------------------------------- */

function renderVideos(entries, contest) {

  const container = document.getElementById("video-container");
  if (!container) return;

  container.innerHTML = "";

  if (!entries || entries.length === 0) {
    container.innerHTML = `<p style="padding:20px;">No videos found.</p>`;
    return;
  }

  const flagCode = contestFlags[contest] || "eu";
  const frag = document.createDocumentFragment();

  entries.forEach(entry => {

    const wrapper = document.createElement("div");
    wrapper.className = "video-item";

    wrapper.dataset.artist = entry.Artist;
    wrapper.dataset.song = entry.Song;
    wrapper.dataset.running = entry.Running_Order;
    wrapper.dataset.place = entry.Place;
    wrapper.dataset.year = entry.Year;
    wrapper.dataset.country = contest;

    wrapper.setAttribute("role","button");
    wrapper.tabIndex = 0;

    const imageUrl =
      `images/${encodeURIComponent(contest)}/${entry.Year}-${entry.Running_Order}.jpeg`;
    //const imageUrl =
    //  `images/national/${contest}/${entry.Year}-${entry.Running_Order}.jpeg`;

    wrapper.innerHTML = `
      <div class="preview-container">
        <img class="thumbnail"
          src="${imageUrl}"
          alt="${escapeHTML(entry.Artist)}">
      </div>

      <div class="video-title-with-icon">

        <div style="display:flex;align-items:center;gap:10px;">

          <img class="flag-icon" src="/flags/${flagCode}.png">

          <div class="video-title-text">
            <div class="title-line">
              <div class="title-artist">${escapeHTML(entry.Artist)}</div>
              <div class="title-song">${escapeHTML(entry.Song)}</div>
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

    const open = (e) => {

      e.preventDefault();
      e.stopPropagation();

      if (!entry.Video_URL) {
        console.error("Missing Video_URL:", entry);
        return;
      }

      if (typeof window.openVideoModal === "function") {

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

  /* Trigger sorting once videos exist */
  if (window.triggerInitialSort) {
    window.triggerInitialSort();
  }

}

/* -------------------------------------------------- */
/* Load contest + year                                */
/* -------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);

  const contest = params.get("contest") || "UMK";
  let year = params.get("year");

  /* If year not supplied → load latest */

  if (!year) {

    const { data } = await supabase
      .from("douzepoints_finland")
      .select("Year")
      .eq("Contest", contest)
      .order("Year",{ ascending:false })
      .limit(1);

    if (data && data.length) {
      year = data[0].Year;
    }

  }

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("*")
    .eq("Contest", contest)
    .eq("Year", year)
    .order("Running_Order",{ ascending:true });

  if (error) {
    console.error("load error:", error);
    return;
  }

  renderVideos(data, contest);

});
