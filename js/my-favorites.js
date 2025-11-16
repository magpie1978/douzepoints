// my-favorites.js
// Show the user's favourite videos, and allow removing them with a fade-out.

const supabase = window.supabaseClient;

document.addEventListener("DOMContentLoaded", initFavoritesPage);

async function initFavoritesPage() {
  if (!supabase) {
    console.error("[my-favorites] Supabase client missing (window.supabaseClient).");
    return;
  }

  // 1. Get logged-in user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("[my-favorites] Error getting user:", userError);
    return showMessage("Error checking your login session.");
  }

  if (!user) {
    // Not logged in – send to login page
    window.location.href = "login.html";
    return;
  }

  const userId = user.id;

  // 2. Get the list of favourite video IDs from user_favorites
  const { data: favRows, error: favError } = await supabase
    .from("user_favorites")
    .select("video_id")
    .eq("user_id", userId);

  if (favError) {
    console.error("[my-favorites] Error loading favourites:", favError);
    return showMessage("Error loading your favourites.");
  }

  if (!favRows || favRows.length === 0) {
    return showMessage("You haven’t favourited any videos yet.");
  }

  const favouriteIds = favRows.map((row) => row.video_id);

  // 3. Load matching videos from douzepoints using Video_Lookup
  const { data: videos, error: videoError } = await supabase
    .from("douzepoints")
    .select("*")
    .in("Video_Lookup", favouriteIds);

  if (videoError) {
    console.error("[my-favorites] Error loading videos:", videoError);
    return showMessage("Error loading videos for your favourites.");
  }

  if (!videos || videos.length === 0) {
    return showMessage("No videos found for your favourites.");
  }

  // 4. Make sure video.js knows the favourites so toggleFavorite behaves correctly
  if (typeof window.ensureFavoritesLoaded === "function") {
    try {
      await window.ensureFavoritesLoaded();
    } catch (e) {
      console.warn("[my-favorites] ensureFavoritesLoaded threw:", e);
    }
  }

  // 5. Use the shared renderer from video.js so cards look exactly like edition.html/country.html
  if (typeof window.renderVideos === "function") {
    window.renderVideos(videos);
  } else {
    console.error("[my-favorites] window.renderVideos is not available.");
    return showMessage("Video renderer is missing.");
  }

  // 6. Force all hearts on this page to be red (favourited state)
  markAllHeartsAsFavorite();

  // 7. Attach handlers to fade out and remove cards when un-favourited
  attachHeartRemovalHandlers();

  // 8. Refresh Lucide icons
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/**
 * Show a simple message in the main container.
 */
function showMessage(msg) {
  const container = document.getElementById("video-container");
  if (!container) return;
  container.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

/**
 * On the My Favourites page, every video shown *is* a favourite,
 * so we make sure every heart button starts in the 'is-favorite' state.
 */
function markAllHeartsAsFavorite() {
  const container = document.getElementById("video-container");
  if (!container) return;

  container.querySelectorAll(".favorite-btn").forEach((btn) => {
    btn.classList.add("is-favorite");
  });
}

/**
 * When a heart is clicked on this page:
 *  - video.js's toggleFavorite() will run first (it updates Supabase + toggles .is-favorite)
 *  - We then detect that it is no longer a favourite
 *  - Fade out the card and remove it from the DOM
 */
function attachHeartRemovalHandlers() {
  const container = document.getElementById("video-container");
  if (!container) return;

  const buttons = container.querySelectorAll(".favorite-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Give video.js's toggleFavorite() a moment to run and update classes
      setTimeout(() => {
        const stillFavorite = btn.classList.contains("is-favorite");
        if (stillFavorite) return; // user re-clicked or something went odd

        const card =
          btn.closest(".video-item") ||
          btn.closest(".carousel-video-item");

        if (!card) return;

        // Add fade-out class, then remove the card after the transition
        card.classList.add("fade-out");

        setTimeout(() => {
          card.remove();

          // If that was the last one, show the empty message
          const remaining = container.querySelectorAll(".video-item, .carousel-video-item").length;
          if (remaining === 0) {
            showMessage("You haven’t favourited any videos yet.");
          }
        }, 300); // keep in sync with CSS transition duration
      }, 120); // small delay so toggleFavorite has time to flip the class
    });
  });
}
