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
    // no session – send to login
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;

  // 2. Get favourite IDs from user_favorites
  const favoriteVideoIds = await fetchFavoriteVideoIds();
  if (!favoriteVideoIds.length) {
    const container = document.getElementById('video-container') 
                   || document.getElementById('favorites-video-container');
    if (container) {
      container.innerHTML = '<p style="padding:20px;">You haven’t added any favourites yet.</p>';
    }
    return;
  }

  // 3. Fetch matching rows from douzepoints using Video_Lookup
  const videos = await fetchVideosByIds(favoriteVideoIds);

  if (!videos.length) {
    const container = document.getElementById('video-container') 
                   || document.getElementById('favorites-video-container');
    if (container) {
      container.innerHTML = '<p style="padding:20px;">No videos found for your favourites.</p>';
    }
    return;
  }

 // 4. Let video.js set up favourite-state
if (window.ensureFavoritesLoaded) {
    await window.ensureFavoritesLoaded();
}

// 5. Render using video.js
window.renderVideos(videos);

// 6. Enable removing favourites directly from this page
enableRemoveFromFavorites();

// 7. Refresh icons
if (window.lucide?.createIcons) {
    window.lucide.createIcons();
}

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
    .in('Video_Lookup', ids);  // ⭐ key fix: match on Video_Lookup

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

    // After video.js toggleFavorite runs, check if the item is un-favourited
    setTimeout(() => {
      const isStillFavorite = favBtn.classList.contains("is-favorite");

      // If no longer favourite → remove card from the DOM
      if (!isStillFavorite) {
        const card = favBtn.closest(".video-item");
        if (card) card.remove();
      }

      // Optional: if the user unfavourited everything, show a nice message:
      const remaining = document.querySelectorAll(".video-item").length;
      if (remaining === 0) {
        container.innerHTML = `<p style="padding:20px;">You haven’t favourited any videos yet.</p>`;
      }

    }, 100); // slight delay so toggleFavorite can update
  });
}

