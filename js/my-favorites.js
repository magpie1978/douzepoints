// my-favorites.js — FINAL WORKING VERSION
// Uses global window.supabaseClient and window.renderVideos

(function () {

  const supabase = window.supabaseClient;

  document.addEventListener("DOMContentLoaded", initFavoritesPage);

  async function initFavoritesPage() {

    // 1. Ensure supabase exists
    if (!supabase) {
      console.error("Supabase client is missing!");
      return;
    }

    // 2. Get logged in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // 3. Load favourites
    const { data: favRows, error: favError } = await supabase
      .from("user_favorites")
      .select("video_id")
      .eq("user_id", user.id);

    if (favError) {
      console.error("Favourites error:", favError);
      return showMessage("Error loading favourites.");
    }

    if (!favRows?.length) {
      return showMessage("You haven’t favourited any videos yet.");
    }

    const ids = favRows.map(r => r.video_id);
    console.log("DEBUG: Favourite IDs =", ids);

    // 4. Load matching video rows
    const { data: videos, error: videoErr } = await supabase
      .from("douzepoints")
      .select("*")
      .in("Video_Lookup", ids);

    console.log("DEBUG: Videos returned =", videos);

    if (videoErr) {
      console.error("Video lookup error:", videoErr);
      return showMessage("Error loading video data.");
    }

    if (!videos?.length) {
      return showMessage("No videos found.");
    }

    // 5. Let video.js load favourite state
    await window.ensureFavoritesLoaded?.();

    // 6. Render using the real renderer from video.js
    window.renderVideos(videos);

    // 7. Refresh lucide icons
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  function showMessage(msg) {
    const el = document.getElementById("video-container");
    el.innerHTML = `<p style="padding:20px;">${msg}</p>`;
  }

})();
