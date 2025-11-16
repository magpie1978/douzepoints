// my-favorites.js — use the same supabase client as the rest of the site
import { supabase } from './supabaseClient.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', initFavoritesPage);

async function initFavoritesPage() {
  // 1. Get logged-in user
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return;
  }

  const user = data?.user;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;

  // 2. Get favourite IDs
  const favoriteVideoIds = await fetchFavoriteVideoIds();
  if (!favoriteVideoIds.length) {
    const container = document.getElementById('video-container');
    container.innerHTML = '<p style="padding:20px;">You haven’t added any favourites yet.</p>';
    return;
  }

  // 3. Get the actual videos from douzepoints
  const videos = await fetchVideosByIds(favoriteVideoIds);

  if (!videos.length) {
    const container = document.getElementById('video-container');
    container.innerHTML = '<p style="padding:20px;">No videos found for your favourites.</p>';
    return;
  }

  // 4. Ensure video.js has loaded favourites state
  if (window.ensureFavoritesLoaded) {
    await window.ensureFavoritesLoaded();
  }

  // 5. Render using the main renderer from video.js
  window.renderVideos(videos);

  // 6. Allow unfavouriting directly from this page
  enableRemoveFromFavorites();

  // 7. Refresh icons
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
} // ← **THIS WAS MISSING**

//
// --- Helper Functions ---
//

async function fetchFavoriteVideoIds() {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('video_id')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Error fetching user favourites:', error);
    return [];
  }

  return data.map(row => row.video_id);
}

async function fetchVideosByIds(ids) {
  const { data, error } = await supabase
    .from('douzepoints')
    .select('*')
    .in('Video_Lookup', ids);  // ⭐ match on Video_Lookup

  if (error) {
    console.error('Error fetching videos by ids:', error);
    return [];
  }

  return data || [];
}

function enableRemoveFromFavorites() {
  const container = document.getElementById("video-container");

  container.addEventListener("click", (e) => {
    const favBtn = e.target.closest(".favorite-btn");
    if (!favBtn) return;

    setTimeout(() => {
      const isStillFavorite = favBtn.classList.contains("is-favorite");

      if (!isStillFavorite) {
        const card = favBtn.closest(".video-item");
        if (card) card.remove();
      }

      const remaining = document.querySelectorAll(".video-item").length;
      if (remaining === 0) {
        container.innerHTML = `<p style="padding:20px;">You haven’t favourited any videos yet.</p>`;
      }

    }, 100);
  });
}
