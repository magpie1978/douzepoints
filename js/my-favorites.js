// my-favorites.js
const supabase = window.supabaseClient;

let currentUser = null;
let allFavoriteVideos = [];
let playlists = [];
let playlistVideosMap = new Map();
let currentPlaylistId = 'all';
let selectedVideoForPlaylist = null;
let playlistHandlersAttached = false;

document.addEventListener('DOMContentLoaded', initFavoritesPage);

async function initFavoritesPage() {
  if (!supabase) {
    console.error('Supabase missing.');
    showMessage('Internal error: Supabase not initialized.');
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  currentUser = userData?.user;
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  const favIds = await fetchFavoriteVideoIds();
  if (!favIds.length) {
    showMessage("You haven't added any favourites yet.");
    return;
  }

  allFavoriteVideos = await fetchVideosByIds(favIds);
  if (!allFavoriteVideos.length) {
    showMessage("No videos found for your favourites.");
    return;
  }

  await loadPlaylistsAndMappings();
  renderPlaylistSidebar();

  if (window.ensureFavoritesLoaded) await window.ensureFavoritesLoaded();

  window.renderVideos(allFavoriteVideos);
  decorateFavoriteCards(allFavoriteVideos);

  attachPlaylistButtonHandlers();
  attachPlaylistSidebarHandlers();
  attachCreatePlaylistModalHandlers();

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* DB FETCH HELPERS */

async function fetchFavoriteVideoIds() {
  const { data } = await supabase
    .from('user_favorites')
    .select('video_id')
    .eq('user_id', currentUser.id);

  return (data || []).map(r => r.video_id);
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
    .order('created_at');

  playlists = plData || [];

  const { data: pvData } = await supabase
    .from('playlist_videos')
    .select('playlist_id, video_id')
    .eq('user_id', currentUser.id);

  playlistVideosMap = new Map();
  (pvData || []).forEach(row => {
    if (!playlistVideosMap.has(row.playlist_id))
      playlistVideosMap.set(row.playlist_id, new Set());
    playlistVideosMap.get(row.playlist_id).add(row.video_id);
  });
}

/* UI HELPERS */

function showMessage(msg) {
  const c = document.getElementById("video-container");
  c.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

/* SIDEBAR RENDERING */

function renderPlaylistSidebar() {
  const listEl = document.getElementById("playlist-list");
  listEl.innerHTML = "";

  const allLi = document.createElement("li");
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

/* APPLY PLAYLIST FILTER */

async function applyPlaylistFilter(id) {
  currentPlaylistId = id;

  document.querySelectorAll(".playlist-item").forEach(li => {
    li.classList.toggle("active", li.dataset.playlistId === id);
  });

  const title = document.getElementById("playlist-title");

  if (id === "all") {
    title.textContent = "All My Favorites";
    window.renderVideos(allFavoriteVideos);
    decorateFavoriteCards(allFavoriteVideos);
    return;
  }

  const pl = playlists.find(p => p.id === id);
  title.textContent = pl ? pl.name : "Playlist";

  const ids = playlistVideosMap.get(id) || new Set();
  const filtered = allFavoriteVideos.filter(v => ids.has(v.Video_Lookup));

  window.renderVideos(filtered);
  decorateFavoriteCards(filtered);
}

/* DECORATE VIDEO CARDS WITH PLAYLIST BUTTON */

function decorateFavoriteCards(videos) {
  const container = document.getElementById("video-container");
  const cards = [...container.querySelectorAll(".video-item, .carousel-video-item")];

  cards.forEach((card, i) => {
    const v = videos[i];
    if (!v) return;

    card.dataset.videoId = v.Video_Lookup;

    const preview = card.querySelector('.preview-container');
    if (!preview) return;

    const old = preview.querySelector('.playlist-btn');
    if (old) old.remove();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playlist-btn';
    btn.dataset.videoId = v.Video_Lookup;
    btn.innerHTML = `<i data-lucide="plus"></i>`;
    preview.appendChild(btn);
  });

  window.lucide?.createIcons();
}

/* CLICK HANDLERS */

function attachPlaylistSidebarHandlers() {
  const listEl = document.getElementById("playlist-list");

  listEl.addEventListener("click", async e => {
    const item = e.target.closest(".playlist-item");
    if (!item) return;

    const playlistId = item.dataset.playlistId;

    if (e.target.closest(".playlist-edit") && playlistId !== "all") {
      openRenameModal(playlistId);
      return;
    }

    if (e.target.closest(".playlist-delete") && playlistId !== "all") {
      openDeleteModal(playlistId);
      return;
    }

    applyPlaylistFilter(playlistId);
  });
}

/* PLAYLIST "+" BUTTON ON VIDEO CARDS */

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const c = document.getElementById("video-container");

  c.addEventListener("click", e => {
    const btn = e.target.closest(".playlist-btn");
    if (!btn) return;

    e.stopImmediatePropagation();
    e.preventDefault();

    const videoId = btn.dataset.videoId;

    if (currentPlaylistId === "all") {
      openCreatePlaylistModal(videoId);
    } else {
      toggleVideoInPlaylist(videoId, currentPlaylistId, btn);
    }
  });
}

/* CREATE PLAYLIST GLASS MODAL */

function attachCreatePlaylistModalHandlers() {
  const overlay = document.getElementById("playlist-create-overlay");
  const cancel = document.getElementById("playlist-cancel-btn");
  const save = document.getElementById("playlist-save-btn");

  cancel.onclick = () => overlay.style.display = "none";

  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.style.display = "none";
  });

  save.onclick = async () => {
    const name = document.getElementById("playlist-input").value.trim();
    if (!name) return;

    await saveVideoToNamedPlaylist(selectedVideoForPlaylist, name);
    overlay.style.display = "none";
    applyPlaylistFilter(currentPlaylistId);
  };
}

function openCreatePlaylistModal(videoId) {
  selectedVideoForPlaylist = videoId;
  document.getElementById("playlist-create-overlay").style.display = "flex";
  document.getElementById("playlist-input").value = "";
  document.getElementById("playlist-input").focus();
}

/* SAVE VIDEO INTO NEW OR EXISTING PLAYLIST */

async function saveVideoToNamedPlaylist(videoId, playlistName) {
  const normalized = playlistName.toLowerCase();
  let pl = playlists.find(p => p.name.toLowerCase() === normalized);

  if (!pl) {
    const { data } = await supabase.from("playlists").insert({
      user_id: currentUser.id,
      name: playlistName
    }).select().single();

    pl = data;
    playlists.push(pl);
    renderPlaylistSidebar();

    currentPlaylistId = pl.id;
    document.getElementById("playlist-title").textContent = pl.name;
  }

  await supabase.from("playlist_videos").insert({
    user_id: currentUser.id,
    playlist_id: pl.id,
    video_id: videoId
  });

  if (!playlistVideosMap.has(pl.id))
    playlistVideosMap.set(pl.id, new Set());
  playlistVideosMap.get(pl.id).add(videoId);
}

/* RENAME PLAYLIST (GLASS MODAL) */

function openRenameModal(id) {
  const pl = playlists.find(p => p.id === id);
  if (!pl) return;

  const overlay = document.getElementById("rename-modal-overlay");
  const input = document.getElementById("rename-input");
  const save = document.getElementById("rename-save-btn");
  const cancel = document.getElementById("rename-cancel-btn");

  input.value = pl.name;
  overlay.style.display = "flex";
  input.focus();

  save.onclick = async () => {
    const newName = input.value.trim();
    if (!newName) return;

    await supabase.from("playlists").update({ name: newName }).eq("id", id);
    pl.name = newName;

    if (currentPlaylistId === id)
      document.getElementById("playlist-title").textContent = newName;

    renderPlaylistSidebar();
    overlay.style.display = "none";
  };

  cancel.onclick = () => overlay.style.display = "none";
}

/* DELETE PLAYLIST (GLASS MODAL) */

function openDeleteModal(id) {
  const overlay = document.getElementById("delete-modal-overlay");

  const confirm = document.getElementById("delete-confirm-btn");
  const cancel = document.getElementById("delete-cancel-btn");

  overlay.style.display = "flex";

  cancel.onclick = () => overlay.style.display = "none";

  confirm.onclick = async () => {
    await supabase.from("playlists").delete().eq("id", id);

    playlists = playlists.filter(p => p.id !== id);
    playlistVideosMap.delete(id);

    if (currentPlaylistId === id) {
      currentPlaylistId = "all";
      document.getElementById("playlist-title").textContent = "All My Favorites";
      window.renderVideos(allFavoriteVideos);
      decorateFavoriteCards(allFavoriteVideos);
    }

    renderPlaylistSidebar();
    overlay.style.display = "none";
  };
}

/* TOGGLE VIDEO IN PLAYLIST */

async function toggleVideoInPlaylist(videoId, playlistId, btn) {
  const set = playlistVideosMap.get(playlistId) || new Set();

  if (set.has(videoId)) {
    await supabase.from("playlist_videos")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("playlist_id", playlistId)
      .eq("video_id", videoId);

    set.delete(videoId);
    playlistVideosMap.set(playlistId, set);

    const card = btn.closest(".video-item");
    if (card) {
      card.classList.add("fade-out");
      setTimeout(() => {
        card.remove();
        if (!document.querySelector(".video-item"))
          showMessage("This playlist has no videos yet.");
      }, 300);
    }
    return;
  }

  await supabase.from("playlist_videos").insert({
    user_id: currentUser.id,
    playlist_id: playlistId,
    video_id: videoId
  });

  set.add(videoId);
  playlistVideosMap.set(playlistId, set);
}

/* UTILS */

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
