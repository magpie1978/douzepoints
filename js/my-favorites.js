// my-favorites.js
// My Favourites page: loads user's favourite videos, supports playlists.

const supabase = window.supabaseClient;

let currentUser = null;

// In-memory state
let allFavoriteVideos = [];
let playlists = [];
let playlistVideosMap = new Map();
let currentPlaylistId = 'all';
let selectedVideoForPlaylist = null;
let playlistHandlersAttached = false;

document.addEventListener('DOMContentLoaded', initFavoritesPage);

async function initFavoritesPage() {
  if (!supabase) {
    console.error('[my-favorites] Supabase client missing.');
    showMessage('Internal error: supabase not initialized.');
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;

  const favoriteVideoIds = await fetchFavoriteVideoIds();
  if (!favoriteVideoIds.length) {
    showMessage("You haven't added any favourites yet.");
    return;
  }

  allFavoriteVideos = await fetchVideosByIds(favoriteVideoIds);
  if (!allFavoriteVideos.length) {
    showMessage("No videos found for your favourites.");
    return;
  }

  await loadPlaylistsAndMappings();
  renderPlaylistSidebar();

  if (window.ensureFavoritesLoaded) {
    await window.ensureFavoritesLoaded();
  }

  window.renderVideos(allFavoriteVideos);
  decorateFavoriteCards(allFavoriteVideos);

  attachPlaylistButtonHandlers();
  attachPlaylistSidebarHandlers();
  attachPlaylistModalHandlers();

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* ----------------- DATA HELPERS ----------------- */

async function fetchFavoriteVideoIds() {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('video_id')
    .eq('user_id', currentUser.id);

  if (error) return [];
  return (data || []).map(row => row.video_id);
}

async function fetchVideosByIds(ids) {
  const { data } = await supabase
    .from('douzepoints')
    .select('*')
    .in('Video_Lookup', ids);

  return data || [];
}

async function loadPlaylistsAndMappings() {
  const { data: plData } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  playlists = plData || [];

  const { data: pvData } = await supabase
    .from('playlist_videos')
    .select('playlist_id, video_id')
    .eq('user_id', currentUser.id);

  playlistVideosMap = new Map();
  (pvData || []).forEach(row => {
    if (!playlistVideosMap.has(row.playlist_id)) {
      playlistVideosMap.set(row.playlist_id, new Set());
    }
    playlistVideosMap.get(row.playlist_id).add(row.video_id);
  });
}

/* ----------------- UI HELPERS ----------------- */

function showMessage(msg) {
  const c = document.getElementById('video-container');
  c.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

function renderPlaylistSidebar() {
  const listEl = document.getElementById('playlist-list');
  listEl.innerHTML = '';

  const allLi = document.createElement('li');
  allLi.className = 'playlist-item active';
  allLi.dataset.playlistId = 'all';
  allLi.innerHTML = `<span>All Favorites</span>`;
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

function decorateFavoriteCards(videoList) {
  const container = document.getElementById('video-container');
  const cards = Array.from(
    container.querySelectorAll('.video-item, .carousel-video-item')
  );

  cards.forEach((card, i) => {
    const v = videoList[i];
    if (!v) return;

    card.dataset.videoId = v.Video_Lookup;

    const preview = card.querySelector('.preview-container');
    if (!preview) return;

    const old = preview.querySelector('.playlist-btn');
    if (old) old.remove();

    const btn = document.createElement('button');
    btn.className = 'playlist-btn';
    btn.type = 'button';
    btn.dataset.videoId = v.Video_Lookup;
    btn.innerHTML = `<i data-lucide="plus"></i>`;
    preview.appendChild(btn);
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* ----------------- CLICK HANDLERS ----------------- */

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const container = document.getElementById('video-container');

  container.addEventListener(
    'click',
    e => {
      const btn = e.target.closest('.playlist-btn');
      if (!btn) return;

      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();

      const videoId = btn.dataset.videoId;

      if (currentPlaylistId !== 'all') {
        toggleVideoInCurrentPlaylist(videoId, btn);
      } else {
        openPlaylistModal(videoId);
      }
    },
    true
  );
}

function attachPlaylistSidebarHandlers() {
  const listEl = document.getElementById('playlist-list');

  listEl.addEventListener('click', async e => {
    const item = e.target.closest('.playlist-item');
    if (!item) return;

    const playlistId = item.dataset.playlistId;

    if (e.target.closest('.playlist-edit') && playlistId !== 'all') {
      await renamePlaylist(playlistId);
      return;
    }

    if (e.target.closest('.playlist-delete') && playlistId !== 'all') {
      await deletePlaylist(playlistId);
      return;
    }

    applyPlaylistFilter(playlistId);
  });
}

function attachPlaylistModalHandlers() {
  const overlay = document.getElementById('playlist-modal-overlay');
  const input = document.getElementById('playlist-input');
  const saveBtn = document.getElementById('playlist-save-btn');
  const cancelBtn = document.getElementById('playlist-cancel-btn');

  cancelBtn.addEventListener('click', () => closePlaylistModal());
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closePlaylistModal();
  });

  saveBtn.addEventListener('click', async () => {
    const name = input.value.trim();
    if (!name) {
      alert('Please enter a playlist name.');
      return;
    }
    await saveVideoToNamedPlaylist(selectedVideoForPlaylist, name);
    closePlaylistModal();
    applyPlaylistFilter(currentPlaylistId);
  });
}

/* ----------------- PLAYLIST OPS ----------------- */

async function applyPlaylistFilter(playlistId) {
  currentPlaylistId = playlistId;

  document.querySelectorAll('.playlist-item').forEach(li => {
    li.classList.toggle('active', li.dataset.playlistId === playlistId);
  });

  const titleEl = document.getElementById('playlist-title');
  if (playlistId === 'all') {
    titleEl.textContent = 'All My Favorites';
  } else {
    const pl = playlists.find(p => p.id === playlistId);
    titleEl.textContent = pl ? pl.name : 'Playlist';
  }

  let filtered = [];
  if (playlistId === 'all') {
    filtered = allFavoriteVideos.slice();
  } else {
    const ids = playlistVideosMap.get(playlistId) || new Set();
    filtered = allFavoriteVideos.filter(v => ids.has(v.Video_Lookup));
  }

  window.renderVideos(filtered);
  decorateFavoriteCards(filtered);

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

async function toggleVideoInCurrentPlaylist(videoId, btn) {
  const playlistId = currentPlaylistId;
  const set = playlistVideosMap.get(playlistId) || new Set();

  if (set.has(videoId)) {
    await supabase
      .from('playlist_videos')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId);

    set.delete(videoId);
    playlistVideosMap.set(playlistId, set);

    const card = btn.closest('.video-item, .carousel-video-item');
    if (card) {
      card.classList.add('fade-out');
      setTimeout(() => {
        card.remove();
        const count = document.querySelectorAll(
          '.video-item, .carousel-video-item'
        ).length;
        if (count === 0)
          showMessage('This playlist has no videos yet.');
      }, 300);
    }
    return;
  }

  await supabase.from('playlist_videos').insert({
    user_id: currentUser.id,
    playlist_id: playlistId,
    video_id: videoId
  });

  set.add(videoId);
  playlistVideosMap.set(playlistId, set);
}

/* CREATE / ADD TO PLAYLIST (from + button when All Favorites) */

function openPlaylistModal(videoId) {
  selectedVideoForPlaylist = videoId;
  const overlay = document.getElementById('playlist-modal-overlay');
  const input = document.getElementById('playlist-input');
  overlay.style.display = 'flex';
  input.value = '';
  input.focus();
}

function closePlaylistModal() {
  document.getElementById('playlist-modal-overlay').style.display = 'none';
  selectedVideoForPlaylist = null;
}

async function saveVideoToNamedPlaylist(videoId, playlistName) {
  const normalized = playlistName.toLowerCase();
  let pl = playlists.find(p => p.name.toLowerCase() === normalized);

  if (!pl) {
    const { data } = await supabase
      .from('playlists')
      .insert({
        user_id: currentUser.id,
        name: playlistName
      })
      .select()
      .single();

    pl = data;
    playlists.push(pl);
    renderPlaylistSidebar();

    currentPlaylistId = pl.id;
    document.getElementById('playlist-title').textContent = pl.name;
  }

  await supabase.from('playlist_videos').insert({
    user_id: currentUser.id,
    playlist_id: pl.id,
    video_id: videoId
  });

  if (!playlistVideosMap.has(pl.id)) {
    playlistVideosMap.set(pl.id, new Set());
  }
  playlistVideosMap.get(pl.id).add(videoId);
}

/* RENAME PLAYLIST via glass modal */

async function renamePlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  const overlay = document.getElementById('rename-modal-overlay');
  const input = document.getElementById('rename-input');
  const saveBtn = document.getElementById('rename-save-btn');
  const cancelBtn = document.getElementById('rename-cancel-btn');

  input.value = pl.name;
  overlay.style.display = 'flex';
  input.focus();

  const cleanup = () => {
    overlay.style.display = 'none';
    saveBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  saveBtn.onclick = async () => {
    const newName = input.value.trim();
    if (!newName) return;

    await supabase
      .from('playlists')
      .update({ name: newName })
      .eq('id', playlistId);

    pl.name = newName;

    if (currentPlaylistId === playlistId) {
      document.getElementById('playlist-title').textContent = newName;
    }

    renderPlaylistSidebar();
    cleanup();
  };

  cancelBtn.onclick = cleanup;
}

/* DELETE PLAYLIST via glass modal */

async function deletePlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  const overlay = document.getElementById('delete-modal-overlay');
  const confirmBtn = document.getElementById('delete-confirm-btn');
  const cancelBtn = document.getElementById('delete-cancel-btn');

  overlay.style.display = 'flex';

  const cleanup = () => {
    overlay.style.display = 'none';
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  confirmBtn.onclick = async () => {
    await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    playlists = playlists.filter(p => p.id !== playlistId);
    playlistVideosMap.delete(playlistId);

    if (currentPlaylistId === playlistId) {
      currentPlaylistId = 'all';
      document.getElementById('playlist-title').textContent =
        'All My Favorites';
      window.renderVideos(allFavoriteVideos);
      decorateFavoriteCards(allFavoriteVideos);
    }

    renderPlaylistSidebar();
    cleanup();
  };

  cancelBtn.onclick = cleanup;
}

/* ----------------- UTILITY ----------------- */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
