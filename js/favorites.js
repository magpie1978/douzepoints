// my-favorites.js — FINAL VERSION
// - Loads favourited videos using Video_Lookup
// - Uses the SAME card renderer from video.js
// - No duplicated HTML
// - Fully uses modal and favourite system

(function () {

  const supabase = window.supabaseClient;

  document.addEventListener("DOMContentLoaded", initFavoritesPage);

  async function initFavoritesPage() {

    // 1. Get logged in user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // 2. Load favourite IDs
    const { data: favRows, error: favError } = await supabase
      .from("user_favorites")
      .select("video_id")
      .eq("user_id", user.id);

    if (favError) {
      console.error("Favourite fetch error:", favError);
      return showMessage("Error loading favourites.");
    }

    if (!favRows || favRows.length === 0) {
      return showMessage("You haven’t favourited any videos yet.");
    }

    const ids = favRows.map(r => r.video_id);

    // 3. Load matching videos from douzepoints
    const { data: videos, error: videoError } = await supabase
      .from("douzepoints")
      .select("*")
      .in("Video_Lookup", ids);   // ⭐ THIS IS THE FIX

    if (videoError) {
      console.error("Video lookup error:", videoError);
      return showMessage("Error loading videos.");
    }

    if (!videos || videos.length === 0) {
      return showMessage("No videos found for your favourites.");
    }

    // 4. Ensure favourite state is loaded for video.js
    await window.ensureFavoritesLoaded?.();

    // 5. Render using the exact same renderer used everywhere else
    window.renderVideos(videos);

    // 6. Reload icons
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  function showMessage(msg) {
    const container = document.getElementById("favorites-video-container") ||
                      document.getElementById("video-container");
    container.innerHTML = `<p style="padding:20px;">${msg}</p>`;
  }

})();
