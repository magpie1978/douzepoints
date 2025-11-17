// my-favorites.js
// Fully patched + stable version with working '+' button + working video modal

const supabase = window.supabaseClient;

let currentUser = null;
let allFavoriteVideos = [];
let playlists = [];
let playlistVideosMap = new Map();
let currentPlaylistId = "all";
let selectedVideoForPlaylist = null;
let playlistHandlersAttached = false;

document.addEventListener("DOMContentLoaded", initFavoritesPage);

/* ============================================================
   INITIALISATION
   ============================================================ */
async function initFavoritesPage() {
  if (!supabase) {
    console.error("[my-favorites] Supabase missing");
    showMessage("Internal setup error.");
    return;
  }

  // Load user
  const { data: userData } = await supabase.auth.getUser();
  currentUser = userData?.user;
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  // Load favorites
  const favoriteIds = await fetchFavoriteVideoIds();
  if (!favoriteIds.length) {
    showMessage("You haven't added any favourites yet.");
    return;
  }

  allFavoriteVideos = await fetchVideosByIds(favoriteIds);

  if (!allFavoriteVideos.length) {
    showMessage("No videos found.");
    return;
  }

  await loadPlaylistsAndMappings();
  renderPlaylistSidebar();

  if (window.ensureFavoritesLoaded) {
    await window.ensureFavoritesLoaded();
  }

  window.renderVideos(allFavoriteVideos);
  decorateFavoriteCards(allFavoriteVideos);

  attachPlaylistButtonHandlers();       // + button on cards
  attachPlaylistSidebarHandlers();      // sidebar
  attachCreatePlaylistModalHandlers();  // create playlist modal

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   FETCH HELPERS
   ============================================================ */

async function fetchFavoriteVideoIds() {
  const { data } = await supabase
    .from("user_favorites")
    .select("video_id")
    .eq("user_id", currentUser.id);

  return (data || []).map((r) => r.video_id);
}

async function fetchVideosByIds(ids) {
  const { data } = await supabase
    .from("douzepoints")
    .select("*")
    .in("Video_Lookup", ids);

  return data || [];
}

async function loadPlaylistsAndMappings() {
  const { data: plData } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at");

  playlists = plData || [];

  const { data: pvData } = await supabase
    .from("playlist_videos")
    .select("playlist_id, video_id")
    .eq("user_id", currentUser.id);

  playlistVideosMap = new Map();
  (pvData || []).forEach((row) => {
    if (!playlistVideosMap.has(row.playlist_id)) {
      playlistVideosMap.set(row.playlist_id, new Set());
    }
    playlistVideosMap.get(row.playlist_id).add(row.video_id);
  });
}

/* ============================================================
   UTILITY
   ============================================================ */

function showMessage(msg) {
  document.getElementById("video-container").innerHTML =
    `<p style="padding:20px;">${msg}</p>`;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   SIDEBAR RENDERING
   ============================================================ */

function renderPlaylistSidebar() {
  const listEl = document.getElementById("playlist-list");
  listEl.innerHTML = "";

  // "All Favorites"
  const liAll = document.createElement("li");
  liAll.className = "playlist-item active";
  liAll.dataset.playlistId = "all";
  liAll.innerHTML = `<span>All Favorites</span>`;
  listEl.appendChild(liAll);

  playlists.forEach((pl) => {
    const li = document.createElement("li");
    li.className = "playlist-item";
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

/* ============================================================
   APPLY PLAYLIST FILTER
   ============================================================ */

function applyPlaylistFilter(id) {
  currentPlaylistId = id;

  document.querySelectorAll(".playlist-item").forEach((li) => {
    li.classList.toggle("active", li.dataset.playlistId === id);
  });

  const title = document.getElementById("playlist-title");

  if (id === "all") {
    title.textContent = "All My Favorites";
    window.renderVideos(allFavoriteVideos);
    decorateFavoriteCards(allFavoriteVideos);
    return;
  }

  const pl = playlists.find((p) => p.id === id);
  title.textContent = pl ? pl.name : "Playlist";

  const ids = playlistVideosMap.get(id) || new Set();

  const filtered = allFavoriteVideos.filter((v) =>
    ids.has(v.Video_Lookup)
  );

  window.renderVideos(filtered);
  decorateFavoriteCards(filtered);

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   DECORATE VIDEO CARDS WITH +
   ============================================================ */

function decorateFavoriteCards(videos) {
  const container = document.getElementById("video-container");

  const cards = Array.from(
    container.querySelectorAll(".video-item, .carousel-video-item")
  );

  cards.forEach((card, i) => {
    const v = videos[i];
    if (!v) return;

    const vid = v.Video_Lookup;
    card.dataset.videoId = vid;

    const preview = card.querySelector(".preview-container");
    if (!preview) return;

    const old = preview.querySelector(".playlist-btn");
    if (old) old.remove();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "playlist-btn";
    btn.dataset.videoId = vid;
    btn.innerHTML = `<i data-lucide="plus"></i>`;

    preview.appendChild(btn);
  });

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   SIDEBAR HANDLERS
   ============================================================ */

function attachPlaylistSidebarHandlers() {
  const list = document.getElementById("playlist-list");

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".playlist-item");
    if (!item) return;

    const id = item.dataset.playlistId;

    // Rename
    if (e.target.closest(".playlist-edit") && id !== "all") {
      openRenameModal(id);
      return;
    }

    // Delete
    if (e.target.closest(".playlist-delete") && id !== "all") {
      openDeleteModal(id);
      return;
    }

    // Switch playlist
    applyPlaylistFilter(id);
  });
}

/* ============================================================
   FIXED FINAL VERSION — "+" BUTTON HANDLER (does NOT block video modal)
   ============================================================ */

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const container = document.getElementById("video-container");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".playlist-btn");
    if (!btn) return; // normal click → video modal

    // Only the '+' button click is intercepted
    e.preventDefault();
    e.stopImmediatePropagation();

    const videoId = btn.dataset.videoId;
    console.log("[+] Playlist button clicked:", videoId);

    if (currentPlaylistId === "all") {
      openCreatePlaylistModal(videoId);
    } else {
      toggleVideoInPlaylist(videoId, currentPlaylistId, btn);
    }
  });
}

/* ============================================================
   CREATE PLAYLIST MODAL (GLASS)
   ============================================================ */

function attachCreatePlaylistModalHandlers() {
  const overlay = document.getElementById("playlist-create-overlay");
  const cancel = document.getElementById("playlist-cancel-btn");
  const save = document.getElementById("playlist-save-btn");

  cancel.onclick = () => {
    overlay.style.display = "none";
    selectedVideoForPlaylist = null;
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.style.display = "none";
      selectedVideoForPlaylist = null;
    }
  });

  save.onclick = async () => {
    const input = document.getElementById("playlist-input");
    const name = input.value.trim();
    if (!name || !selectedVideoForPlaylist) return;

    await saveVideoToNamedPlaylist(selectedVideoForPlaylist, name);

    overlay.style.display = "none";
    selectedVideoForPlaylist = null;
    applyPlaylistFilter(currentPlaylistId);
  };
}

function openCreatePlaylistModal(videoId) {
  selectedVideoForPlaylist = videoId;
  const overlay = document.getElementById("playlist-create-overlay");
  const input = document.getElementById("playlist-input");

  overlay.style.display = "flex";
  input.value = "";
  input.focus();
}

/* ============================================================
   SAVE VIDEO TO PLAYLIST
   ============================================================ */

async function saveVideoToNamedPlaylist(videoId, playlistName) {
  const normalized = playlistName.toLowerCase();
  let pl = playlists.find((p) => p.name.toLowerCase() === normalized);

  if (!pl) {
    const { data } = await supabase
      .from("playlists")
      .insert({
        user_id: currentUser.id,
        name: playlistName,
      })
      .select()
      .single();

    pl = data;
    playlists.push(pl);
    renderPlaylistSidebar();

    currentPlaylistId = pl.id;
    document.getElementById("playlist-title").textContent = pl.name;
  }

  await supabase.from("playlist_videos").insert({
    user_id: currentUser.id,
    playlist_id: pl.id,
    video_id: videoId,
  });

  if (!playlistVideosMap.has(pl.id)) {
    playlistVideosMap.set(pl.id, new Set());
  }

  playlistVideosMap.get(pl.id).add(videoId);
}

/* ============================================================
   RENAME PLAYLIST (GLASS MODAL)
   ============================================================ */

function openRenameModal(playlistId) {
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;

  const overlay = document.getElementById("rename-modal-overlay");
  const input = document.getElementById("rename-input");
  const saveBtn = document.getElementById("rename-save-btn");
  const cancelBtn = document.getElementById("rename-ccancel-btn");

  // Correction (cancel button ID):
  const cancel = document.getElementById("rename-cancel-btn");

  input.value = pl.name;
  overlay.style.display = "flex";
  input.focus();

  saveBtn.onclick = async () => {
    const newName = input.value.trim();
    if (!newName) return;

    await supabase
      .from("playlists")
      .update({ name: newName })
      .eq("id", playlistId);

    pl.name = newName;

    if (currentPlaylistId === playlistId) {
      document.getElementById("playlist-title").textContent = newName;
    }

    renderPlaylistSidebar();
    overlay.style.display = "none";
  };

  cancel.onclick = () => overlay.style.display = "none";
}

/* ============================================================
   DELETE PLAYLIST (GLASS MODAL)
   ============================================================ */

function openDeleteModal(playlistId) {
  const overlay = document.getElementById("delete-modal-overlay");
  const confirm = document.getElementById("delete-confirm-btn");
  const cancel = document.getElementById("delete-cancel-btn");

  overlay.style.display = "flex";

  cancel.onclick = () => overlay.style.display = "none";

  confirm.onclick = async () => {
    await supabase.from("playlists").delete().eq("id", playlistId);

    playlists = playlists.filter((p) => p.id !== playlistId);
    playlistVideosMap.delete(playlistId);

    if (currentPlaylistId === playlistId) {
      currentPlaylistId = "all";
      document.getElementById("playlist-title").textContent =
        "All My Favorites";

      window.renderVideos(allFavoriteVideos);
      decorateFavoriteCards(allFavoriteVideos);
    }

    renderPlaylistSidebar();
    overlay.style.display = "none";
  };
}

/* ============================================================
   TOGGLE VIDEO IN PLAYLIST
   ============================================================ */

async function toggleVideoInPlaylist(videoId, playlistId, btn) {
  let set = playlistVideosMap.get(playlistId) || new Set();

  if (set.has(videoId)) {
    await supabase
      .from("playlist_videos")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("playlist_id", playlistId)
      .eq("video_id", videoId);

    set.delete(videoId);
    playlistVideosMap.set(playlistId, set);

    const card = btn.closest(".video-item, .carousel-video-item");
    if (card) {
      card.classList.add("fade-out");
      setTimeout(() => {
        card.remove();

        if (!document.querySelector(".video-item")) {
          showMessage("This playlist has no videos yet.");
        }
      }, 300);
    }
    return;
  }

  // Add video to playlist
  await supabase.from("playlist_videos").insert({
    user_id: currentUser.id,
    playlist_id: playlistId,
    video_id: videoId,
  });

  set.add(videoId);
  playlistVideosMap.set(playlistId, set);
}
