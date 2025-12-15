// my-favorites.js
// Favourites + Playlists for my-favorites.html

const supabase = window.supabaseClient;

// Auth / core state
let currentUser = null;

// All favourite videos (rows from douzepoints)
let allFavoriteVideos = [];

// Playlists + mapping of playlist_id -> Set(video_id)
let playlists = [];
let playlistVideosMap = new Map();

// UI / state
let currentPlaylistId = "all";          // "all" or a real playlist.id
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
    console.error("[my-favorites] window.supabaseClient is missing.");
    return;
  }

  // 1. Get logged-in user
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("[my-favorites] Error getting user:", userError);
    return showMessage("Error checking your login session.");
  }

  const user = userData?.user || null;

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  // 2. Load favourites and playlists
  await loadFavorites();
  await loadPlaylistsAndMappings();

  // 3. If no favourites, still show sidebar but with message
  if (!allFavoriteVideos.length) {
    renderPlaylistSidebar();
    showMessage("You haven’t favourited any videos yet.");
    attachPlaylistSidebarHandlers();
    attachCreatePlaylistModalHandlers();
    return;
  }

  // 4. Render sidebar + default "All Favorites"
  renderPlaylistSidebar();
  applyPlaylistFilter("all");

  // 5. Attach handlers
  attachPlaylistSidebarHandlers();
  attachPlaylistButtonHandlers();
  attachHeartHandlers();
  attachCreatePlaylistModalHandlers();

  // Icons
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   LOAD DATA
   ============================================================ */

async function loadFavorites() {
  // Get favourite video_ids for this user
  const { data: favRows, error: favError } = await supabase
    .from("user_favorites")
    .select("video_id")
    .eq("user_id", currentUser.id);

  if (favError) {
    console.error("[my-favorites] Error loading favourites:", favError);
    return showMessage("Error loading your favourites.");
  }

  if (!favRows || favRows.length === 0) {
    allFavoriteVideos = [];
    return;
  }

  const favouriteIds = favRows.map((row) => row.video_id);

  // Get matching rows from douzepoints via Video_Lookup
  const { data: videos, error: videosError } = await supabase
    .from("douzepoints")
    .select("*")
    .in("Video_Lookup", favouriteIds);

  if (videosError) {
    console.error("[my-favorites] Error loading videos from douzepoints:", videosError);
    return showMessage("Error loading videos for your favourites.");
  }

  allFavoriteVideos = videos || [];

  // Make sure video.js has its own favourites cache
  if (typeof window.ensureFavoritesLoaded === "function") {
    try {
      await window.ensureFavoritesLoaded();
    } catch (e) {
      console.warn("[my-favorites] ensureFavoritesLoaded threw:", e);
    }
  }
}

async function loadPlaylistsAndMappings() {
  // User playlists
  const { data: plData, error: plError } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true });

  if (plError) {
    console.error("[my-favorites] Error loading playlists:", plError);
    playlists = [];
  } else {
    playlists = plData || [];
  }

  // Mapping playlist_id -> video_id
  const { data: pvData, error: pvError } = await supabase
    .from("playlist_videos")
    .select("playlist_id, video_id")
    .eq("user_id", currentUser.id);

  if (pvError) {
    console.error("[my-favorites] Error loading playlist_videos:", pvError);
    playlistVideosMap = new Map();
    return;
  }

  playlistVideosMap = new Map();
  (pvData || []).forEach((row) => {
    if (!playlistVideosMap.has(row.playlist_id)) {
      playlistVideosMap.set(row.playlist_id, new Set());
    }
    playlistVideosMap.get(row.playlist_id).add(row.video_id);
  });
}

/* ============================================================
   BASIC UI HELPERS
   ============================================================ */

function showMessage(msg) {
  const c = document.getElementById("video-container");
  if (!c) return;
  c.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   PLAYLIST SIDEBAR RENDERING
   ============================================================ */

function renderPlaylistSidebar() {
  const listEl = document.getElementById("playlist-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  // Default pseudo-playlist: All Favorites
  const liAll = document.createElement("li");
  liAll.className = "playlist-item" + (currentPlaylistId === "all" ? " active" : "");
  liAll.dataset.playlistId = "all";
  liAll.innerHTML = `<span>All Favorites</span>`;
  listEl.appendChild(liAll);

  playlists.forEach((pl) => {
    const li = document.createElement("li");
    li.className = "playlist-item" + (currentPlaylistId === pl.id ? " active" : "");
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

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   APPLY PLAYLIST FILTER
   ============================================================ */

function applyPlaylistFilter(id) {
  currentPlaylistId = id;

  // Highlight active playlist in sidebar
  document.querySelectorAll(".playlist-item").forEach((li) => {
    li.classList.toggle("active", li.dataset.playlistId === id);
  });

  const titleEl = document.getElementById("playlist-title");

  // "All Favorites"
  if (id === "all") {
    if (titleEl) titleEl.textContent = "All My Favorites";

    if (typeof window.renderVideos === "function") {
      window.renderVideos(allFavoriteVideos);
    } else {
      console.error("[my-favorites] window.renderVideos is missing.");
      return;
    }

    decorateFavoriteCards(allFavoriteVideos);
    markAllHeartsAsFavorite();

    if (window.lucide?.createIcons) window.lucide.createIcons();
    return;
  }

  // Specific playlist
  const pl = playlists.find((p) => p.id === id);
  if (titleEl) titleEl.textContent = pl ? pl.name : "Playlist";

  const idsSet = playlistVideosMap.get(id) || new Set();
  const filtered = allFavoriteVideos.filter((v) => idsSet.has(v.Video_Lookup));

  if (!filtered.length) {
    if (typeof window.renderVideos === "function") {
      window.renderVideos([]); // clear container
    }
    showMessage("This playlist has no videos yet.");
    return;
  }

  if (typeof window.renderVideos === "function") {
    window.renderVideos(filtered);
  } else {
    console.error("[my-favorites] window.renderVideos is missing.");
    return;
  }

  decorateFavoriteCards(filtered);
  markAllHeartsAsFavorite();

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/* ============================================================
   DECORATE VIDEO CARDS WITH "+" BUTTON
   ============================================================ */

function decorateFavoriteCards(videos) {
  const container = document.getElementById("video-container");
  if (!container) return;

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

    // Remove any existing '+' to avoid duplicates
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
   FAVOURITE HEART STATE HELPERS
   ============================================================ */

function markAllHeartsAsFavorite() {
  const c = document.getElementById("video-container");
  if (!c) return;

  c.querySelectorAll(".favorite-btn").forEach((btn) => {
    btn.classList.add("is-favorite");
  });
}

/**
 * On this page, clicking the heart should:
 *  - Remove from user_favorites in Supabase
 *  - Fade out the card and remove from DOM
 *  - Update in-memory lists and playlist mappings
 */
function attachHeartHandlers() {
  if (heartHandlersAttached) return;
  heartHandlersAttached = true;

  const container = document.getElementById("video-container");
  if (!container) return;

  container.addEventListener(
    "click",
    async (e) => {
      const btn = e.target.closest(".favorite-btn");
      if (!btn) return;

      // Stop video.js toggleFavorite from running
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const card =
        btn.closest(".video-item") || btn.closest(".carousel-video-item");

      const videoId =
        card?.dataset.videoId ||
        btn.dataset.videoKey ||
        btn.dataset.videoId;

      if (!videoId || !currentUser) return;

      // Remove from Supabase favourites
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("video_id", videoId);

      if (error) {
        console.error("[my-favorites] Error removing favourite:", error);
        return;
      }

      // Update local lists
      allFavoriteVideos = allFavoriteVideos.filter(
        (v) => v.Video_Lookup !== videoId
      );

      playlistVideosMap.forEach((set) => {
        if (set.has(videoId)) set.delete(videoId);
      });

      btn.classList.remove("is-favorite");

      if (card) {
        card.classList.add("fade-out");
        setTimeout(() => {
          card.remove();

          const remaining = document.querySelectorAll(
            ".video-item, .carousel-video-item"
          ).length;

          if (remaining === 0) {
            showMessage("You haven’t favourited any videos yet.");
          }
        }, 300);
      }
    },
    true // capture phase to intercept before video.js listeners
  );
}

/* ============================================================
   PLAYLIST SIDEBAR HANDLERS
   ============================================================ */

function attachPlaylistSidebarHandlers() {
  const list = document.getElementById("playlist-list");
  if (!list) return;

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

    // Just selecting playlist
    applyPlaylistFilter(id);
  });
}

/* ============================================================
   "+" BUTTON HANDLER ON CARDS
   ============================================================ */

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const container = document.getElementById("video-container");
  if (!container) return;

  // Use capture mode so we intercept BEFORE video.js/modal
  container.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".playlist-btn");
      if (!btn) return; // not the + button

      // Stop modal opening
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const videoId = btn.dataset.videoId;
      if (!videoId) {
        console.warn("[my-favorites] Playlist button missing videoId");
        return;
      }

      // In "All Favorites" → open Create/Add modal
      if (currentPlaylistId === "all") {
        openCreatePlaylistModal(videoId);
        return;
      }

      // In a specific playlist → toggle presence
      toggleVideoInPlaylist(videoId, currentPlaylistId, btn);
    },
    true
  );
}

/* ============================================================
   CREATE / ADD-TO PLAYLIST MODAL (DROPDOWN + "NEW")
   ============================================================ */

function populatePlaylistDropdown() {
  const select = document.getElementById("playlist-select");
  if (!select) return;

  select.innerHTML = "";

  // Existing playlists
  playlists.forEach((pl) => {
    const opt = document.createElement("option");
    opt.value = pl.id;
    opt.textContent = pl.name;
    select.appendChild(opt);
  });

  // "Create new" option at the end
  const newOpt = document.createElement("option");
  newOpt.value = "new";
  newOpt.textContent = "➕ Create new playlist…";
  select.appendChild(newOpt);
}

function handlePlaylistSelectChange() {
  const select = document.getElementById("playlist-select");
  const wrapper = document.getElementById("new-playlist-wrapper");
  if (!select || !wrapper) return;

  wrapper.style.display = (select.value === "new") ? "block" : "none";
}

function attachCreatePlaylistModalHandlers() {
  const overlay = document.getElementById("playlist-create-overlay");
  const cancel = document.getElementById("playlist-cancel-btn");
  const save   = document.getElementById("playlist-save-btn");
  const select = document.getElementById("playlist-select");

  if (!overlay || !cancel || !save || !select) return;

  // Dropdown change
  select.addEventListener("change", handlePlaylistSelectChange);

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

    // Refresh playlists/mappings + sidebar, but stay on currentPlaylistId
    await loadPlaylistsAndMappings();
    renderPlaylistSidebar();
    applyPlaylistFilter(currentPlaylistId);
  };
}

function openCreatePlaylistModal(videoId) {
  selectedVideoForPlaylist = videoId;

  const overlay  = document.getElementById("playlist-create-overlay");
  const select   = document.getElementById("playlist-select");
  const newInput = document.getElementById("new-playlist-name");

  if (!overlay || !select || !newInput) return;

  populatePlaylistDropdown();

  // Default selection: first existing playlist if any, else "new"
  if (playlists.length) {
    select.value = playlists[0].id;
  } else {
    select.value = "new";
  }
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
   CREATE PLAYLIST + ADD VIDEO
   ============================================================ */

async function createNewPlaylist(name) {
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: currentUser.id,
      name
    })
    .select()
    .single();

  if (error) {
    console.error("[my-favorites] Error creating playlist:", error);
    return null;
  }

  playlists.push(data);
  return data.id;
}

async function addVideoToPlaylist(videoId, playlistId) {
  const { error } = await supabase
    .from("playlist_videos")
    .insert({
      user_id: currentUser.id,
      playlist_id: playlistId,
      video_id: videoId
    });

  if (error) {
    console.error("[my-favorites] Error adding video to playlist:", error);
    return;
  }

  if (!playlistVideosMap.has(playlistId)) {
    playlistVideosMap.set(playlistId, new Set());
  }
  playlistVideosMap.get(playlistId).add(videoId);
}

/* ============================================================
   RENAME PLAYLIST (GLASS MODAL)
   ============================================================ */

function openRenameModal(playlistId) {
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;

  const overlay  = document.getElementById("rename-modal-overlay");
  const input    = document.getElementById("rename-input");
  const saveBtn  = document.getElementById("rename-save-btn");
  const cancelBtn= document.getElementById("rename-cancel-btn");

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

/* ============================================================
   DELETE PLAYLIST (GLASS MODAL)
   ============================================================ */

function openDeleteModal(playlistId) {
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;

  const overlay   = document.getElementById("delete-modal-overlay");
  const confirmBtn= document.getElementById("delete-confirm-btn");
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

    playlists = playlists.filter((p) => p.id !== playlistId);
    playlistVideosMap.delete(playlistId);

    // If we deleted the active playlist, revert to "All Favorites"
    if (currentPlaylistId === playlistId) {
      currentPlaylistId = "all";
      const title = document.getElementById("playlist-title");
      if (title) title.textContent = "All My Favorites";

      if (typeof window.renderVideos === "function") {
        window.renderVideos(allFavoriteVideos);
      }
      decorateFavoriteCards(allFavoriteVideos);
      markAllHeartsAsFavorite();
    }

    renderPlaylistSidebar();
    overlay.style.display = "none";
  };
}

/* ============================================================
   TOGGLE VIDEO IN CURRENT PLAYLIST (FROM "+")
   ============================================================ */

async function toggleVideoInPlaylist(videoId, playlistId, btn) {
  let set = playlistVideosMap.get(playlistId) || new Set();

  // Already in playlist → remove it
  if (set.has(videoId)) {
    const { error } = await supabase
      .from("playlist_videos")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("playlist_id", playlistId)
      .eq("video_id", videoId);

    if (error) {
      console.error("[my-favorites] Error removing from playlist:", error);
      return;
    }

    set.delete(videoId);
    playlistVideosMap.set(playlistId, set);

    // Fade card out of this view
    const card = btn.closest(".video-item, .carousel-video-item");
    if (card) {
      card.classList.add("fade-out");
      setTimeout(() => {
        card.remove();
        const remaining = document.querySelectorAll(
          ".video-item, .carousel-video-item"
        ).length;
        if (remaining === 0) {
          showMessage("This playlist has no videos yet.");
        }
      }, 300);
    }

    return;
  }

  // Not in playlist → add it
  const { error } = await supabase
    .from("playlist_videos")
    .insert({
      user_id: currentUser.id,
      playlist_id: playlistId,
      video_id: videoId
    });

  if (error) {
    console.error("[my-favorites] Error adding to playlist:", error);
    return;
  }

  set.add(videoId);
  playlistVideosMap.set(playlistId, set);
}
