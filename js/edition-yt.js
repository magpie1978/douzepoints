// edition-yt.js
import { supabase } from "./supabaseClient.js";

// -------------------------------------------
// Override: Load edition videos but use YT_URL
// -------------------------------------------
function loadEditionYT() {
  const params = new URLSearchParams(window.location.search);
  const year = params.get("edition");
  if (!year) return;

  fetchAndRenderYT(s =>
    s.from("douzepoints")
      .select("*")
      .eq("Year", year)
      .order("Final_Rank", { ascending: true })
  );
}

// -------------------------------------------
// Fetch wrapper but passes YT_URL into renderer
// -------------------------------------------
async function fetchAndRenderYT(queryFn) {
  const { data, error } = await queryFn(supabase);

  if (error) {
    console.error("Error loading edition-yt:", error);
    return;
  }

  const container = document.getElementById("video-container");
  if (!data || data.length === 0) {
    container.innerHTML = `<p style="padding:16px;">No videos found.</p>`;
    return;
  }

  renderVideosYT(data);
}

// -------------------------------------------
// Render using YT_URL instead of Video_URL
// -------------------------------------------
function renderVideosYT(entries) {
  const container = document.getElementById("video-container");
  container.innerHTML = "";

  const frag = document.createDocumentFragment();
  entries.forEach(entry => {
    frag.appendChild(renderYTEntry(entry));
  });

  container.appendChild(frag);

  if (window.lucide?.createIcons) window.lucide.createIcons();
  if (window.triggerInitialSort) window.triggerInitialSort();
}

// -------------------------------------------
// Clone of renderEntry() but with videoUrl = entry.YT_URL
// -------------------------------------------
function renderYTEntry(entry) {
  const wrapper = document.createElement("div");
  wrapper.className = "video-item";

  const videoUrl = entry.YT_URL;      // ⭐ KEY CHANGE
  const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;

  wrapper.innerHTML = `
    <div class="preview-container" data-video-url="${videoUrl}">
      <img class="thumbnail" src="${imageUrl}">
    </div>

    <div class="video-title-with-icon">
      <div class="title-artist">${entry.Artist}</div>
      <div class="title-song">${entry.Song}</div>
    </div>
  `;

  wrapper.addEventListener("click", () => {
    openVideoModal(videoUrl, entry);
  });

  return wrapper;
}

// -------------------------------------------
// When edition-yt.html loads
// -------------------------------------------
document.addEventListener("DOMContentLoaded", loadEditionYT);
