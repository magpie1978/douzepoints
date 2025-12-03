// my-favorites.js
// Fully patched version — unified on data-video-key, fully compatible with video.js

const supabase = window.supabaseClient;
if (!supabase) {
  console.error("[my-favorites] ERROR: window.supabaseClient not found.");
}

// Auth state
let currentUser = null;

// All favourite videos from douzepoints
let allFavoriteVideos = [];

// Playlists
let playlists = [];
let playlistVideosMap = new Map();

// UI + state
let currentPlaylistId = "all";
let selectedVideoForPlaylist = null;

// Handler guards
let playlistHandlersAttached = false;
let heartHandlersAttached = false;

document.addEventListener("DOMContentLoaded", initFavoritesPage);

/* ============================================================
   INIT
   ============================================================ */

async function initFavoritesPage() {
  if (!supabase) {
    console.error("[my-favorites] Supabase client missing.");
    return;
  }

  // 1. Get active user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("[my-favorites] Error getting user:", userError);
    return showMessage("Error checking your session.");
  }

  const user = userData?.user || null;
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  // 2. Load favourites + playlists
  await loadFavorites();
  await loadPlaylistsAndMappings();

  // 3. If no favourites → show sidebar + message
  if (!allFavoriteVideos.length) {
    renderPlaylistSidebar();
    showMessage("You haven’t favourited any videos yet.");
    attachPlaylistSidebarHandlers();
    attachCreatePlaylistModalHandlers();
    return;
  }

  // 4. Sidebar + default "All Favorites"
  renderPlaylistSidebar();
  applyPlaylistFilter("all");

  // 5. Attach handlers
  attachPlaylistSidebarHandlers();
  attachPlaylistButtonHandlers();
  attachHeartHandlers();
  attachCreatePlaylistModalHandlers();

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   LOAD DATA
   ============================================================ */

async function loadFavorites() {
  // Load favourite video_ids
  const { data: favRows, error: favError } = await supabase
    .from("user_favorites")
    .select("video_id")
    .eq("user_id", currentUser.id);

  if (favError) {
    console.error("[my-favorites] Error loading favourites:", favError);
    return showMessage("Error loading favourites.");
  }

  if (!favRows?.length) {
    allFavoriteVideos = [];
    return;
  }

  const favouriteIds = favRows.map(r => r.video_id);

  // Fetch matching videos
  const { data: videos, error: videosError } = await supabase
    .from("douzepoints")
    .select("*")
    .in("Video_Lookup", favouriteIds);

  if (videosError) {
    console.error("[my-favorites] Error loading videos:", videosError);
    return showMessage("Error loading favourite videos.");
  }

  allFavoriteVideos = videos || [];

  // Sync video.js favourite state
  if (window.ensureFavoritesLoaded) {
    try {
      await window.ensureFavoritesLoaded();
    } catch (e) {
      console.warn("[my-favorites] ensureFavoritesLoaded error:", e);
    }
  }
}

async function loadPlaylistsAndMappings() {
  // Playlists
  const { data: plData, error: plError } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true });

  playlists = plError ? [] : plData || [];

  // Playlist-to-video mapping
  const { data: pvData, error: pvError } = await supabase
    .from("playlist_videos")
    .select("playlist_id, video_id")
    .eq("user_id", currentUser.id);

  playlistVideosMap = new Map();
  if (!pvError && pvData) {
    pvData.forEach(row => {
      if (!playlistVideosMap.has(row.playlist_id)) {
        playlistVideosMap.set(row.playlist_id, new Set());
      }
      playlistVideosMap.get(row.playlist_id).add(row.video_id);
    });
  }
}

/* ============================================================
   BASIC UI
   ============================================================ */

function showMessage(msg) {
  const c = document.getElementById("video-container");
  if (!c) return;
  c.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

/* ============================================================
   PLAYLIST SIDEBAR
   ============================================================ */

function renderPlaylistSidebar() {
  const listEl = document.getElementById("playlist-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  // All Favorites row
  const liAll = document.createElement("li");
  liAll.className = "playlist-item" + (currentPlaylistId === "all" ? " active" : "");
  liAll.dataset.playlistId = "all";
  liAll.innerHTML = `<span>All Favorites</span>`;
  listEl.appendChild(liAll);

  // User playlists
  playlists.forEach(pl => {
    const li = document.createElement("li");
    li.className = "playlist-item" + (currentPlaylistId === pl.id ? " active" : "");
    li.dataset.playlistId = pl.id;

    li.innerHTML = `
      <span class="playlist-name">${pl.name}</span>
      <span class="playlist-actions">
        <i data-lucide="edit-2" class="playlist-edit"></i>
        <i data-lucide="trash-2" class="playlist-delete"></i>
      </span>
    `;

    listEl.appendChild(li);
  });

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   APPLY PLAYLIST FILTER
   ============================================================ */

function applyPlaylistFilter(id) {
  currentPlaylistId = id;

  // Sidebar active highlight
  document.querySelectorAll(".playlist-item").forEach(li => {
    li.classList.toggle("active", li.dataset.playlistId === id);
  });

  const title = document.getElementById("playlist-title");

  // ALL favorites
  if (id === "all") {
    if (title) title.textContent = "All My Favorites";
    window.renderVideos(allFavoriteVideos);

    decorateFavoriteCards(allFavoriteVideos);
    markAllHeartsAsFavorite();
    if (window.lucide?.createIcons) window.lucide.createIcons();
    return;
  }

  // Specific playlist
  const pl = playlists.find(p => p.id === id);
  if (title) title.textContent = pl ? pl.name : "Playlist";

  const idsSet = playlistVideosMap.get(id) || new Set();
  const filtered = allFavoriteVideos.filter(v => idsSet.has(v.Video_Lookup));

  if (!filtered.length) {
    window.renderVideos([]);
    showMessage("This playlist has no videos yet.");
    return;
  }

  window.renderVideos(filtered);
  decorateFavoriteCards(filtered);
  markAllHeartsAsFavorite();

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   DECORATE VIDEO CARDS (+ BUTTON)
   ============================================================ */

function decorateFavoriteCards(videos) {
  const container = document.getElementById("video-container");
  if (!container) return;

  const cards = [...container.querySelectorAll(".video-item, .carousel-video-item")];

  cards.forEach((card, i) => {
    const entry = videos[i];
    if (!entry) return;

    const key = entry.Video_Lookup;
    card.dataset.videoKey = key;

    const preview = card.querySelector(".preview-container");
    if (!preview) return;

    // Remove old buttons
    const old = preview.querySelector(".playlist-btn");
    if (old) old.remove();

    // Add new "+" button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "playlist-btn";
    btn.dataset.videoKey = key;
    btn.innerHTML = `<i data-lucide="plus"></i>`;

    preview.appendChild(btn);
  });

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   HEART ICON LOGIC
   ============================================================ */

function markAllHeartsAsFavorite() {
  document.querySelectorAll("#video-container .favorite-btn").forEach(btn => {
    btn.classList.add("is-favorite");
  });
}

function attachHeartHandlers() {
  if (heartHandlersAttached) return;
  heartHandlersAttached = true;

  const container = document.getElementById("video-container");
  if (!container) return;

  container.addEventListener(
    "click",
    async e => {
      const btn = e.target.closest(".favorite-btn");
      if (!btn) return;

      // Prevent modal opening / video.js handler
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const key = btn.dataset.videoKey;
      if (!key) return;

      // Remove from DB
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("video_id", key);

      if (error) {
        console.error("[my-favorites] Error removing favourite:", error);
        return;
      }

      // Update memory
      allFavoriteVideos = allFavoriteVideos.filter(v => v.Video_Lookup !== key);
      playlistVideosMap.forEach(set => set.delete(key));

      // Remove card
      const card = btn.closest(".video-item, .carousel-video-item");
      if (card) {
        card.classList.add("fade-out");
        setTimeout(() => {
          card.remove();

          if (!document.querySelector(".video-item, .carousel-video-item")) {
            showMessage("You haven’t favourited any videos yet.");
          }
        }, 300);
      }
    },
    true
  );
}

/* ============================================================
   SIDEBAR HANDLERS
   ============================================================ */

function attachPlaylistSidebarHandlers() {
  const list = document.getElementById("playlist-list");
  if (!list) return;

  list.addEventListener("click", e => {
    const item = e.target.closest(".playlist-item");
    if (!item) return;

    const id = item.dataset.playlistId;

    if (e.target.closest(".playlist-edit") && id !== "all") {
      openRenameModal(id);
      return;
    }

    if (e.target.closest(".playlist-delete") && id !== "all") {
      openDeleteModal(id);
      return;
    }

    applyPlaylistFilter(id);
  });
}

/* ============================================================
   "+" BUTTON HANDLERS
   ============================================================ */

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const container = document.getElementById("video-container");
  if (!container) return;

  container.addEventListener(
    "click",
    e => {
      const btn = e.target.closest(".playlist-btn");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const key = btn.dataset.videoKey;
      if (!key) return;

      if (currentPlaylistId === "all") {
        openCreatePlaylistModal(key);
        return;
      }

      toggleVideoInPlaylist(key, currentPlaylistId, btn);
    },
    true
  );
}

/* ============================================================
   CREATE / ADD PLAYLIST MODAL
   ============================================================ */

function populatePlaylistDropdown() {
  const select = document.getElementById("playlist-select");
  if (!select) return;

  select.innerHTML = "";

  playlists.forEach(pl => {
    const opt = document.createElement("option");
    opt.value = pl.id;
    opt.textContent = pl.name;
    select.appendChild(opt);
  });

  const newOpt = document.createElement("option");
  newOpt.value = "new";
  newOpt.textContent = "➕ Create new playlist…";
  select.appendChild(newOpt);
}

function handlePlaylistSelectChange() {
  const select = document.getElementById("playlist-select");
  const wrapper = document.getElementById("new-playlist-wrapper");
  if (!select || !wrapper) return;

  wrapper.style.display = select.value === "new" ? "block" : "none";
}

function attachCreatePlaylistModalHandlers() {
  const overlay = document.getElementById("playlist-create-overlay");
  const cancel = document.getElementById("playlist-cancel-btn");
  const save = document.getElementById("playlist-save-btn");
  const select = document.getElementById("playlist-select");

  if (!overlay || !cancel || !save || !select) return;

  select.addEventListener("change", handlePlaylistSelectChange);

  cancel.onclick = () => {
    overlay.style.display = "none";
    selectedVideoForPlaylist = null;
  };

  overlay.addEventListener("click", e => {
    if (e.target === overlay) {
      overlay.style.display = "none";
      selectedVideoForPlaylist = null;
    }
  });

  save.onclick = async () => {
    if (!selectedVideoForPlaylist) return;

    const chosen = select.value;
    let playlistId;

    if (chosen === "new") {
      const nameInput = document.getElementById("new-playlist-name");
      const name = nameInput.value.trim();
      if (!name) {
        alert("Please enter a playlist name.");
        return;
      }

      playlistId = await createNewPlaylist(name);
    } else {
      playlistId = chosen;
    }

    if (playlistId) {
      await addVideoToPlaylist(selectedVideoForPlaylist, playlistId);
    }

    overlay.style.display = "none";
    selectedVideoForPlaylist = null;

    // Refresh sidebar + current playlist
    await loadPlaylistsAndMappings();
    renderPlaylistSidebar();
    applyPlaylistFilter(currentPlaylistId);
  };
}

function openCreatePlaylistModal(videoKey) {
  selectedVideoForPlaylist = videoKey;

  const overlay = document.getElementById("playlist-create-overlay");
  const select = document.getElementById("playlist-select");
  const newInput = document.getElementById("new-playlist-name");

  if (!overlay || !select || !newInput) return;

  populatePlaylistDropdown();

  select.value = playlists.length ? playlists[0].id : "new";
  handlePlaylistSelectChange();

  overlay.style.display = "flex";

  if (select.value === "new") {
    newInput.value = "";
    newInput.focus();
  } else {
    select.focus();
  }
}

/* ============================================================
   PLAYLIST CRUD
   ============================================================ */

async function createNewPlaylist(name) {
  const { data, error } = await supabase
    .from("playlists")
    .insert({ user_id: currentUser.id, name })
    .select()
    .single();

  if (error) {
    console.error("[my-favorites] Error creating playlist:", error);
    return null;
  }

  playlists.push(data);
  return data.id;
}

async function addVideoToPlaylist(videoKey, playlistId) {
  const { error } = await supabase
    .from("playlist_videos")
    .insert({
      user_id: currentUser.id,
      playlist_id: playlistId,
      video_id: videoKey
    });

  if (error) {
    console.error("[my-favorites] Error adding video:", error);
    return;
  }

  if (!playlistVideosMap.has(playlistId)) {
    playlistVideosMap.set(playlistId, new Set());
  }
  playlistVideosMap.get(playlistId).add(videoKey);
}

function openRenameModal(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  const overlay = document.getElementById("rename-modal-overlay");
  const input = document.getElementById("rename-input");
  const saveBtn = document.getElementById("rename-save-btn");
  const cancelBtn = document.getElementById("rename-cancel-btn");

  if (!overlay || !input || !saveBtn || !cancelBtn) return;

  input.value = pl.name;
  overlay.style.display = "flex";
  input.focus();

  saveBtn.onclick = async () => {
    const newName = input.value.trim();
    if (!newName) return;

    const { error } = await supabase
      .from("playlists")
      .update({ name: newName })
      .eq("id", playlistId);

    if (error) {
      console.error("[my-favorites] Error renaming playlist:", error);
      return;
    }

    pl.name = newName;

    if (currentPlaylistId === playlistId) {
      const title = document.getElementById("playlist-title");
      if (title) title.textContent = newName;
    }

    renderPlaylistSidebar();
    overlay.style.display = "none";
  };

  cancelBtn.onclick = () => {
    overlay.style.display = "none";
  };
}

function openDeleteModal(playlistId) {
  const overlay = document.getElementById("delete-modal-overlay");
  const confirmBtn = document.getElementById("delete-confirm-btn");
  const cancelBtn = document.getElementById("delete-cancel-btn");

  if (!overlay || !confirmBtn || !cancelBtn) return;

  overlay.style.display = "flex";

  cancelBtn.onclick = () => {
    overlay.style.display = "none";
  };

  confirmBtn.onclick = async () => {
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId);

    if (error) {
      console.error("[my-favorites] Error deleting playlist:", error);
      return;
    }

    // Remove locally
    playlists = playlists.filter(p => p.id !== playlistId);
    playlistVideosMap.delete(playlistId);

    // If deleted active playlist → switch back to "All Favorites"
    if (currentPlaylistId === playlistId) {
      currentPlaylistId = "all";
      const title = document.getElementById("playlist-title");
      if (title) title.textContent = "All My Favorites";

      window.renderVideos(allFavoriteVideos);
      decorateFavoriteCards(allFavoriteVideos);
      markAllHeartsAsFavorite();
    }

    renderPlaylistSidebar();
    overlay.style.display = "none";
  };
}

/* ============================================================
   TOGGLE VIDEO IN PLAYLIST
   ============================================================ */

async function toggleVideoInPlaylist(videoKey, playlistId, btn) {
  let set = playlistVideosMap.get(playlistId) || new Set();

  // Already in playlist → remove
  if (set.has(videoKey)) {
    const { error } = await supabase
      .from("playlist_videos")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("playlist_id", playlistId)
      .eq("video_id", videoKey);

    if (error) {
      console.error("[my-favorites] Error removing from playlist:", error);
      return;
    }

    set.delete(videoKey);
    playlistVideosMap.set(playlistId, set);

    // Remove card from view
    const card = btn.closest(".video-item, .carousel-video-item");
    if (card) {
      card.classList.add("fade-out");
      setTimeout(() => {
        card.remove();

        if (!document.querySelector(".video-item, .carousel-video-item")) {
          showMessage("This playlist has no videos yet.");
        }
      }, 300);
    }
    return;
  }

  // Not in playlist → add
  const { error } = await supabase
    .from("playlist_videos")
    .insert({
      user_id: currentUser.id,
      playlist_id: playlistId,
      video_id: videoKey
    });

  if (error) {
    console.error("[my-favorites] Error adding to playlist:", error);
    return;
  }

  set.add(videoKey);
  playlistVideosMap.set(playlistId, set);
}
