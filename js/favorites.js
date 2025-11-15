import { supabase } from './supabaseClient.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', initFavoritesPage);

async function initFavoritesPage() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // you may want to redirect to login
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;

  const favoriteVideoIds = await fetchFavoriteVideoIds();
  if (!favoriteVideoIds.length) {
    document.getElementById('favorites-video-container').innerHTML =
      '<p>You haven’t added any favorites yet.</p>';
    return;
  }

  const videos = await fetchVideosByIds(favoriteVideoIds);
  renderFavoriteVideos(videos);
  lucide.createIcons();
}

async function fetchFavoriteVideoIds() {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('video_id')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Error fetching user favorites:', error);
    return [];
  }
  return data.map(row => row.video_id);
}

async function fetchVideosByIds(ids) {
  const { data, error } = await supabase
    .from('douzepoints')
    .select('*')
    .in('Video_Lookup', ids);  // ⭐ THIS IS THE FIX

  if (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
  return data;
}


function renderFavoriteVideos(videos) {
  const container = document.getElementById('favorites-video-container');
  container.innerHTML = '';

  videos.forEach(row => {
    const card = document.createElement('div');
    card.className = 'video-item';

    const previewHtml = `
      <img src="${row.thumbnail_url}" alt="${row.song}" />
    `; // adapt to your actual fields

    card.innerHTML = `
      <div class="preview-container">
        <button
          class="favorite-btn is-favorite"
          data-video-id="${row.id}"
          aria-label="Toggle favorite"
        >
          <i data-lucide="heart"></i>
        </button>

        ${previewHtml}
      </div>

      <div class="video-title-with-icon">
        <!-- replicate edition.html layout here: flag, country, artist, song, scores, etc -->
        <div class="video-title-text">
          ${row.country} – ${row.artist} – "${row.song}"
        </div>
      </div>
    `;

    // You probably already have click-to-open-modal logic; mirror it here
    card.addEventListener('click', () => {
      openVideoModal(row); // whatever you use in video.js
    });

    container.appendChild(card);
  });

  // Attach handlers to allow un-favoriting from this page if you want:
  attachFavoriteHandlers();
}
