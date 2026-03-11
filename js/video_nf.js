import { supabase } from "./supabaseClient.js";

/* -------------------------------------------------- */
/* Utility                                             */
/* -------------------------------------------------- */

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

/* -------------------------------------------------- */
/* Render videos                                      */
/* -------------------------------------------------- */

function renderVideos(entries, country) {

  const container = document.getElementById("video-container");
  if (!container) return;

  container.innerHTML = "";

  if (!entries || entries.length === 0) {
    container.innerHTML = `<p style="padding:20px;">No videos found.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();

  entries.forEach(entry => {

    const wrapper = document.createElement("div");
    wrapper.className = "video-item";

    /* Dataset for sorting */
    wrapper.dataset.artist = entry.Artist;
    wrapper.dataset.song = entry.Song;
    wrapper.dataset.running = entry.Running_Order;
    wrapper.dataset.place = entry.Place;
    wrapper.dataset.year = entry.Year;
    wrapper.dataset.country = country;

    wrapper.setAttribute("role","button");
    wrapper.tabIndex = 0;

    
    /* Image path based on new folder column */
    const imageUrl = `/images/${entry.folder}/${entry.Year}-${entry.Place}.jpeg`;

    wrapper.innerHTML = `
      <div class="preview-container">
        <img class="thumbnail"
          src="${imageUrl}"
          alt="${escapeHTML(entry.Artist)}">
      </div>

      <div class="video-title-with-icon">

        <div style="display:flex;align-items:center;gap:10px;">

          <img class="flag-icon" src="/flags/${country}.png">

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

    /* Video open handler */

    const openVideo = (e) => {

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

    wrapper.addEventListener("click", openVideo);
    wrapper.querySelector(".thumbnail")?.addEventListener("click", openVideo);

    frag.appendChild(wrapper);

  });

  container.appendChild(frag);

  /* Trigger sorting once videos exist */

  if (window.triggerInitialSort) {
    window.triggerInitialSort();
  }

}

/* -------------------------------------------------- */
/* Load contest videos                                */
/* -------------------------------------------------- */

async function loadVideos() {

  const params = new URLSearchParams(window.location.search);

  const country = params.get("contest") || "fi";
  let year = params.get("year");

  /* -------------------------------------------------- */
  /* Determine latest year if none provided              */
  /* -------------------------------------------------- */

  if (!year) {

    const { data } = await supabase
      .from("douzepoints_finland")
      .select("Year")
      .eq("country", country)
      .order("Year",{ ascending:false })
      .limit(1);

    if (data && data.length) {
      year = data[0].Year;
    }

  }

  /* -------------------------------------------------- */
  /* Load entries                                       */
  /* -------------------------------------------------- */

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("*")
    .eq("country", country)
    .eq("Year", year)
    .order("Place",{ ascending:true });

  if (error) {
    console.error("Video load error:", error);
    return;
  }

  renderVideos(data, country);

}

document.addEventListener("DOMContentLoaded", loadVideos);
