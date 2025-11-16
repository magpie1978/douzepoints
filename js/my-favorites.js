// my-favorites.js
// My Favourites page: loads user's favourite videos, supports playlists.

const supabase = window.supabaseClient;

let currentUser = null;

// In-memory state
let allFavoriteVideos = [];        // full video rows from douzepoints
let playlists = [];               // array of { id, name, user_id, created_at }
let playlistVideosMap = new Map(); // playlist_id -> Set of video_id (Video_Lookup)
let currentPlaylistId = 'all';    // 'all' or a playlist uuid
let selectedVideoForPlaylist = null;
let playlistHandlersAttached = false;

document.addEventListener('DOMContentLoaded', initFavoritesPage);

async function initFavoritesPage() {
  if (!supabase) {
    console.error('[my-favorites] Supabase client not found on window.supabaseClient');
    showMessage('Internal error: supabase not initialized.');
    return;
  }

  // 1. Get logged-in user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('[my-favorites] Error getting user:', userError);
    showMessage('Error checking your login session.');
    return;
  }

  const user = userData?.user;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;

  // 2. Load favourite video IDs for this user
  const favoriteVideoIds = await fetchFavoriteVideoIds();
  if (!favoriteVideoIds.length) {
    showMessage("You haven't added any favourites yet.");
    return;
  }

  // 3. Load full video rows
  allFavoriteVideos = await fetchVideosByIds(favoriteVideoIds);
  if (!allFavoriteVideos.length) {
    showMessage('No videos found for your favourites.');
    return;
  }

  // 4. Load playlists + mappings
  await loadPlaylistsAndMappings();

  // 5. Render sidebar
  renderPlaylistSidebar();

  // 6. Render videos
  if (window.ensureFavoritesLoaded) {
    await window.ensureFavoritesLoaded();
  }

  window.renderVideos(allFavoriteVideos);
  decorateFavoriteCards(allFavoriteVideos);

  // 7. Attach handlers
  attachPlaylistButtonHandlers();
  attachPlaylistSidebarHandlers();
  attachPlaylistModalHandlers();

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* --------------------------------------------------------
   DATA HELPERS
---------------------------------------------------------*/

async function fetchFavoriteVideoIds() {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('video_id')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('[my-favorites] Error fetching favourites:', error);
    return [];
  }
  return (data || []).map(row => row.video_id);
}

async function fetchVideosByIds(ids) {
  const { data, error } = await supabase
    .from('douzepoints')
    .select('*')
    .in('Video_Lookup', ids);

  if (error) {
    console.error('[my-favorites] Error fetching videos:', error);
    return [];
  }
  return data || [];
}

async function loadPlaylistsAndMappings() {
  const { data: plData, error: plError } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  playlists = plError ? [] : (plData || []);

  const { data: pvData, error: pvError } = await supabase
    .from('playlist_videos')
    .select('playlist_id, video_id')
    .eq('user_id', currentUser.id);

  playlistVideosMap = new Map();
  if (!pvError && pvData) {
    pvData.forEach(row => {
      if (!playlistVideosMap.has(row.playlist_id))
        playlistVideosMap.set(row.playlist_id, new Set());
      playlistVideosMap.get(row.playlist_id).add(row.video_id);
    });
  }
}

/* --------------------------------------------------------
   UI HELPERS
---------------------------------------------------------*/

function showMessage(msg) {
  const container = document.getElementById('video-container');
  if (!container) return;
  container.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

function renderPlaylistSidebar() {
  const listEl = document.getElementById('playlist-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  const allLi = document.createElement('li');
  allLi.className = 'playlist-item active';
  allLi.dataset.playlistId = 'all';
  allLi.innerHTML = `<span>All Videos</span>`;
  listEl.appendChild(allLi);

  playlists.forEach(pl => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.dataset.playlistId = pl.id;

    li.innerHTML = `
      <span class="playlist-name">${escapeHtml(pl.name)}</span>
      <span class="playlist-actions">
        <i data-lucide="edit-2" class="playlist-edit"></i>
        <i data-lucide="trash-2" class="playlist-delete"></i>
      </span>
    `;
    listEl.appendChild(li);
  });
}

/* Add playlist buttons to cards */
function decorateFavoriteCards(videoList) {
  const container = document.getElementById('video-container');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll('.video-item, .carousel-video-item'));

  cards.forEach((card, idx) => {
    const video = videoList[idx];
    if (!video) return;

    const videoId = video.Video_Lookup;
    card.dataset.videoId = videoId;

    const preview = card.querySelector('.preview-container');
    if (!preview) return;

    const oldBtn = preview.querySelector('.playlist-btn');
    if (oldBtn) oldBtn.remove();

    const btn = document.createElement('button');
    btn.className = 'playlist-btn';
    btn.type = 'button';
    btn.dataset.videoId = videoId;
    btn.innerHTML = `<i data-lucide="plus"></i>`;

    preview.appendChild(btn);
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* --------------------------------------------------------
   EVENT HANDLERS
---------------------------------------------------------*/

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const container = document.getElementById('video-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.playlist-btn');
    if (!btn) return;

    // IMPORTANT: Prevent clicking card, image, preview from opening video modal
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();

    const videoId = btn.dataset.videoId;

    if (currentPlaylistId !== 'all') {
      await toggleVideoInCurrentPlaylist(videoId, btn);
    } else {
      openPlaylistModal(videoId);
    }
  }, true); // capture phase improves isolation
}

function attachPlaylistSidebarHandlers() {
  const listEl = document.getElementById('playlist-list');
  if (!listEl) return;

  listEl.addEventListener('click', async (e) => {
    const editIcon = e.target.closest('.playlist-edit');
    const deleteIcon = e.target.closest('.playlist-delete');
    const item = e.target.closest('.playlist-item');

    if (!item) return;

    const playlistId = item.dataset.playlistId;

    if (editIcon && playlistId !== 'all') {
      await renamePlaylist(playlistId);
      return;
    }

    if (deleteIcon && playlistId !== 'all') {
      await deletePlaylist(playlistId);
      return;
    }

    await applyPlaylistFilter(playlistId);
  });
}

function attachPlaylistModalHandlers() {
  const overlay = document.getElementById('playlist-modal-overlay');
  const saveBtn = document.getElementById('playlist-save-btn');
  const cancelBtn = document.getElementById('playlist-cancel-btn');
  const input = document.getElementById('playlist-input');

  if (!overlay) return;

  cancelBtn.addEventListener('click', () => closePlaylistModal());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePlaylistModal();
  });

  saveBtn.addEventListener('click', async () => {
    const name = input.value.trim();
    if (!name) {
      alert('Please enter a playlist name.');
      return;
    }
    if (!selectedVideoForPlaylist) {
      console.warn('[my-favorites] No video selected for playlist.');
      closePlaylistModal();
      return;
    }

    await saveVideoToNamedPlaylist(selectedVideoForPlaylist, name);
    closePlaylistModal();
  });
}

/* --------------------------------------------------------
   PLAYLIST OPERATIONS
---------------------------------------------------------*/

async function applyPlaylistFilter(playlistId) {
  currentPlaylistId = playlistId;

  const listEl = document.getElementById('playlist-list');
  if (listEl) {
    listEl.querySelectorAll('.playlist-item')
      .forEach(li => li.classList.toggle('active', li.dataset.playlistId === playlistId));
  }

  let filteredVideos = [];

  if (playlistId === 'all') {
    filteredVideos = allFavoriteVideos.slice();
  } else {
    const idsSet = playlistVideosMap.get(playlistId) || new Set();
    filteredVideos = allFavoriteVideos.filter(v => idsSet.has(v.Video_Lookup));
  }

  window.renderVideos(filteredVideos);
  decorateFavoriteCards(filteredVideos);

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

async function toggleVideoInCurrentPlaylist(videoId, btn) {
  const playlistId = currentPlaylistId;
  if (playlistId === 'all') return;

  const vidSet = playlistVideosMap.get(playlistId) || new Set();

  // Remove from playlist
  if (vidSet.has(videoId)) {
    const { error } = await supabase
      .from('playlist_videos')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId);

    if (!error) {
      vidSet.delete(videoId);
      playlistVideosMap.set(playlistId, vidSet);

      const card = btn.closest('.video-item, .carousel-video-item');
      if (card) {
        card.classList.add('fade-out');
        setTimeout(() => {
          card.remove();
          const remaining = document.querySelectorAll('.video-item').length;
          if (remaining === 0) showMessage('This playlist has no videos yet.');
        }, 300);
      }
    }
    return;
  }

  // Add to playlist
  const { error } = await supabase
    .from('playlist_videos')
    .insert({
      user_id: currentUser.id,
      playlist_id: playlistId,
      video_id: videoId
    });

  if (!error) {
    vidSet.add(videoId);
    playlistVideosMap.set(playlistId, vidSet);
  }
}

function openPlaylistModal(videoId) {
  selectedVideoForPlaylist = videoId;
  const overlay = document.getElementById('playlist-modal-overlay');
  const input = document.getElementById('playlist-input');
  input.value = '';
  overlay.style.display = 'flex';
  input.focus();
}

function closePlaylistModal() {
  const overlay = document.getElementById('playlist-modal-overlay');
  overlay.style.display = 'none';
  selectedVideoForPlaylist = null;
}

async function saveVideoToNamedPlaylist(videoId, playlistName) {
  const nameLower = playlistName.toLowerCase();
  let playlist = playlists.find(pl => (pl.name || '').toLowerCase() === nameLower);

  if (!playlist) {
    // Create playlist
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: currentUser.id,
        name: playlistName
      })
      .select()
      .single();

    if (error) {
      console.error('[my-favorites] Error creating playlist:', error);
      return;
    }

    playlist = data;
    playlists.push(playlist);
    renderPlaylistSidebar();
  }

  // Add video to playlist
  const { error: pvErr } = await supabase
    .from('playlist_videos')
    .insert({
      user_id: currentUser.id,
      playlist_id: playlist.id,
      video_id: videoId
    });

  if (!pvErr) {
    if (!playlistVideosMap.has(playlist.id)) {
      playlistVideosMap.set(playlist.id, new Set());
    }
    playlistVideosMap.get(playlist.id).add(videoId);
  }
}

async function renamePlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  const newName = prompt('Rename playlist:', pl.name);
  if (!newName) return;

  const trimmed = newName.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('playlists')
    .update({ name: trimmed })
    .eq('id', playlistId);

  if (!error) {
    pl.name = trimmed;
    renderPlaylistSidebar();
  }
}

async function deletePlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  if (!confirm(`Delete playlist "${pl.name}"?`)) return;

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);

  if (!error) {
    playlists = playlists.filter(p => p.id !== playlistId);
    playlistVideosMap.delete(playlistId);

    if (currentPlaylistId === playlistId) {
      currentPlaylistId = 'all';
      window.renderVideos(allFavoriteVideos);
      decorateFavoriteCards(allFavoriteVideos);
    }

    renderPlaylistSidebar();
  }
}

/* --------------------------------------------------------
   UTILS
---------------------------------------------------------*/

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
