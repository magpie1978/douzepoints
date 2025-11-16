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

  // 3. Load full video rows from douzepoints
  allFavoriteVideos = await fetchVideosByIds(favoriteVideoIds);
  if (!allFavoriteVideos.length) {
    showMessage('No videos found for your favourites.');
    return;
  }

  // 4. Load playlists + playlist_videos for this user
  await loadPlaylistsAndMappings();

  // 5. Render playlist sidebar
  renderPlaylistSidebar();

  // 6. Render all favourite videos initially
  if (window.ensureFavoritesLoaded) {
    try {
      await window.ensureFavoritesLoaded();
    } catch (e) {
      console.warn('[my-favorites] ensureFavoritesLoaded threw:', e);
    }
  }

  if (!window.renderVideos) {
    console.error('[my-favorites] window.renderVideos is not defined (is video.js loaded?)');
    showMessage('Video renderer is missing.');
    return;
  }

  window.renderVideos(allFavoriteVideos);
  decorateFavoriteCards(allFavoriteVideos);

  // 7. Attach event handlers (once)
  attachPlaylistButtonHandlers();
  attachPlaylistSidebarHandlers();
  attachPlaylistModalHandlers();

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

// ----------------------
// Data fetch helpers
// ----------------------

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
    console.error('[my-favorites] Error fetching videos by ids:', error);
    return [];
  }
  return data || [];
}

async function loadPlaylistsAndMappings() {
  // Load playlists
  const { data: plData, error: plError } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  if (plError) {
    console.error('[my-favorites] Error fetching playlists:', plError);
    playlists = [];
  } else {
    playlists = plData || [];
  }

  // Load playlist_videos mappings
  const { data: pvData, error: pvError } = await supabase
    .from('playlist_videos')
    .select('playlist_id, video_id')
    .eq('user_id', currentUser.id);

  if (pvError) {
    console.error('[my-favorites] Error fetching playlist_videos:', pvError);
    playlistVideosMap = new Map();
  } else {
    playlistVideosMap = new Map();
    (pvData || []).forEach(row => {
      const pid = row.playlist_id;
      const vid = row.video_id;
      if (!playlistVideosMap.has(pid)) {
        playlistVideosMap.set(pid, new Set());
      }
      playlistVideosMap.get(pid).add(vid);
    });
  }
}

// ----------------------
// UI helpers
// ----------------------

function showMessage(msg) {
  const container = document.getElementById('video-container');
  if (!container) return;
  container.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

function renderPlaylistSidebar() {
  const listEl = document.getElementById('playlist-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  // "All Videos" entry
  const allLi = document.createElement('li');
  allLi.className = 'playlist-item active';
  allLi.dataset.playlistId = 'all';
  allLi.innerHTML = `<span>All Videos</span>`;
  listEl.appendChild(allLi);

  // User playlists
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

// Called after renderVideos() to decorate cards with playlist buttons + data attributes
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

    // Remove an existing playlist button if any (to avoid duplicates)
    const oldBtn = preview.querySelector('.playlist-btn');
    if (oldBtn) oldBtn.remove();

    const btn = document.createElement('button');
    btn.className = 'playlist-btn';
    btn.setAttribute('type', 'button');
    btn.dataset.videoId = videoId;
    btn.innerHTML = `<i data-lucide="plus"></i>`;

    preview.appendChild(btn);
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

// ----------------------
// Event handlers
// ----------------------

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const container = document.getElementById('video-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.playlist-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const videoId = btn.dataset.videoId;
    if (!videoId || !currentUser) return;

    // If a specific playlist is selected => toggle membership in that playlist
    if (currentPlaylistId !== 'all') {
      await toggleVideoInCurrentPlaylist(videoId, btn);
    } else {
      // "All Videos" selected => open modal to choose / create playlist
      openPlaylistModal(videoId);
    }
  });
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
      // Rename playlist
      await renamePlaylist(playlistId);
      return;
    }

    if (deleteIcon && playlistId !== 'all') {
      // Delete playlist
      await deletePlaylist(playlistId);
      return;
    }

    // Otherwise, it's a normal click to filter
    await applyPlaylistFilter(playlistId);
  });
}

function attachPlaylistModalHandlers() {
  const overlay = document.getElementById('playlist-modal-overlay');
  const saveBtn = document.getElementById('playlist-save-btn');
  const cancelBtn = document.getElementById('playlist-cancel-btn');
  const input = document.getElementById('playlist-input');

  if (!overlay || !saveBtn || !cancelBtn || !input) return;

  cancelBtn.addEventListener('click', () => {
    closePlaylistModal();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePlaylistModal();
    }
  });

  saveBtn.addEventListener('click', async () => {
    const name = input.value.trim();
    if (!name) {
      alert('Please enter a playlist name.');
      return;
    }
    if (!selectedVideoForPlaylist) {
      console.warn('[my-favorites] No video selected for playlist assignment.');
      closePlaylistModal();
      return;
    }
    await saveVideoToNamedPlaylist(selectedVideoForPlaylist, name);
    closePlaylistModal();
  });
}

// ----------------------
// Playlist operations
// ----------------------

async function applyPlaylistFilter(playlistId) {
  currentPlaylistId = playlistId;

  const listEl = document.getElementById('playlist-list');
  if (listEl) {
    listEl.querySelectorAll('.playlist-item').forEach(li => {
      li.classList.toggle('active', li.dataset.playlistId === playlistId);
    });
  }

  let filteredVideos = [];

  if (playlistId === 'all') {
    filteredVideos = allFavoriteVideos.slice();
  } else {
    const idsSet = playlistVideosMap.get(playlistId) || new Set();
    filteredVideos = allFavoriteVideos.filter(v => idsSet.has(v.Video_Lookup));
  }

  if (window.renderVideos) {
    window.renderVideos(filteredVideos);
    decorateFavoriteCards(filteredVideos);
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }
}

async function toggleVideoInCurrentPlaylist(videoId, btn) {
  const playlistId = currentPlaylistId;
  if (!playlistId || playlistId === 'all') return;

  const set = playlistVideosMap.get(playlistId) || new Set();

  if (set.has(videoId)) {
    // Remove from playlist
    const { error } = await supabase
      .from('playlist_videos')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId);

    if (error) {
      console.error('[my-favorites] Error removing video from playlist:', error);
      return;
    }

    set.delete(videoId);
    playlistVideosMap.set(playlistId, set);

    // If we're viewing this playlist, fade out the card
    const card = btn.closest('.video-item, .carousel-video-item');
    if (card && currentPlaylistId === playlistId) {
      card.classList.add('fade-out');
      setTimeout(() => {
        card.remove();
        const container = document.getElementById('video-container');
        if (container) {
          const remaining = container.querySelectorAll('.video-item, .carousel-video-item').length;
          if (remaining === 0) {
            showMessage("This playlist has no videos yet.");
          }
        }
      }, 300);
    }
  } else {
    // Add to current playlist
    const { error } = await supabase
      .from('playlist_videos')
      .insert({
        user_id: currentUser.id,
        playlist_id: playlistId,
        video_id: videoId
      });

    if (error) {
      console.error('[my-favorites] Error adding video to playlist:', error);
      return;
    }
    set.add(videoId);
    playlistVideosMap.set(playlistId, set);
  }
}

function openPlaylistModal(videoId) {
  selectedVideoForPlaylist = videoId;
  const overlay = document.getElementById('playlist-modal-overlay');
  const input = document.getElementById('playlist-input');
  if (!overlay || !input) return;

  input.value = '';
  overlay.style.display = 'flex';
  input.focus();
}

function closePlaylistModal() {
  const overlay = document.getElementById('playlist-modal-overlay');
  const input = document.getElementById('playlist-input');
  if (overlay) overlay.style.display = 'none';
  if (input) input.value = '';
  selectedVideoForPlaylist = null;
}

async function saveVideoToNamedPlaylist(videoId, playlistName) {
  // Find existing playlist with same name (case-insensitive)
  const nameLower = playlistName.toLowerCase();
  let playlist = playlists.find(pl => (pl.name || '').toLowerCase() === nameLower);

  if (!playlist) {
    // Create new playlist
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

    // Update sidebar
    renderPlaylistSidebar();
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  // Insert video into playlist_videos
  const { error: pvError } = await supabase
    .from('playlist_videos')
    .insert({
      user_id: currentUser.id,
      playlist_id: playlist.id,
      video_id: videoId
    });

  if (pvError) {
    if (pvError.code === '23505') {
      // unique constraint (already in playlist) – safe to ignore
      return;
    }
    console.error('[my-favorites] Error adding video to playlist_videos:', pvError);
    return;
  }

  // Update local mapping
  if (!playlistVideosMap.has(playlist.id)) {
    playlistVideosMap.set(playlist.id, new Set());
  }
  playlistVideosMap.get(playlist.id).add(videoId);
}

async function renamePlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  const newName = window.prompt('Rename playlist:', pl.name);
  if (!newName) return;

  const trimmed = newName.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('playlists')
    .update({ name: trimmed })
    .eq('id', playlistId);

  if (error) {
    console.error('[my-favorites] Error renaming playlist:', error);
    return;
  }

  pl.name = trimmed;
  renderPlaylistSidebar();
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

async function deletePlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  const confirmDelete = window.confirm(`Delete playlist "${pl.name}"? This will not delete the videos themselves.`);
  if (!confirmDelete) return;

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);

  if (error) {
    console.error('[my-favorites] Error deleting playlist:', error);
    return;
  }

  // Remove from local state
  playlists = playlists.filter(p => p.id !== playlistId);
  playlistVideosMap.delete(playlistId);

  // If we were viewing this playlist, revert to "All Videos"
  if (currentPlaylistId === playlistId) {
    currentPlaylistId = 'all';
    if (window.renderVideos) {
      window.renderVideos(allFavoriteVideos);
      decorateFavoriteCards(allFavoriteVideos);
    }
  }

  renderPlaylistSidebar();
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

// ----------------------
// Small helper
// ----------------------
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
