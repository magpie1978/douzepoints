// edition-yt.js
// --------------------------------------------------
// Edition page that plays videos using YT_URL
// Reuses the existing renderer from video.js
// --------------------------------------------------

const supabaseYT = window.supabaseClient || null;

document.addEventListener("DOMContentLoaded", () => {
  loadEditionYT();
});

async function loadEditionYT() {
  if (!supabaseYT) {
    console.error("[edition-yt] Supabase client not available.");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const year = params.get("edition");

  if (!year) {
    console.warn("[edition-yt] No ?edition=YEAR in URL");
    return;
  }

  const { data, error } = await supabaseYT
    .from("douzepoints")
    .select("*")
    .eq("Year", year)
    .order("Final_Rank", { ascending: true });

  if (error) {
    console.error("[edition-yt] Error loading data:", error);
    return;
  }

  if (!data || data.length === 0) {
    const container = document.getElementById("video-container");
    if (container) {
      container.innerHTML = `<p style="padding:20px;">No videos found.</p>`;
    }
    return;
  }

  // ⭐ IMPORTANT: swap Video_URL to YT_URL before rendering
  const patchedEntries = data.map(entry => ({
    ...entry,
    Video_URL: entry.YT_URL   // this is what the modal will play
  }));

  // Ensure favourites cache is ready (from video.js)
  if (window.ensureFavoritesLoaded) {
    await window.ensureFavoritesLoaded();
  }

  if (typeof window.renderVideos === "function") {
    window.renderVideos(patchedEntries);
  } else {
    console.error(
      "[edition-yt] renderVideos() not found – make sure video.js is loaded."
    );
  }
}
