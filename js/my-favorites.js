// my-favorites.js
// Fully patched version – My Favourites + Playlists with glass modals

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
    console.error("[my-favorites] Supabase client missing.");
    showMessage("Internal error: Supabase not initialised.");
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = userData.user;

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

  if (window.ensureFavoritesLoaded) {
    await window.ensureFavoritesLoaded();
  }

  window.renderVideos(allFavoriteVideos);
  decorateFavoriteCards(allFavoriteVideos);

  attachPlaylistButtonHandlers();
  attachPlaylistSidebarHandlers();
  attachCreatePlaylistModalHandlers();

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* ============================================================
   DATA FETCH HELPERS
   ============================================================ */

async function fetchFavoriteVideoIds() {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("video_id")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("[my-favorites] Error fetching favourites:", error);
    return [];
  }
  return (data || []).map((r) => r.video_id);
}

async function fetchVideosByIds(ids) {
  const { data, error } = await supabase
    .from("douzepoints")
    .select("*")
    .in("Video_Lookup", ids);

  if (error) {
    console.error("[my-favorites] Error fetching video rows:", error);
    return [];
  }
  return data || [];
}

async function loadPlaylistsAndMappings() {
  const { data: plData, error: plError } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at");

  if (plError) {
    console.error("[my-favorites] Error loading playlists:", plError);
    playlists = [];
  } else {
    playlists = plData || [];
  }

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
   UI UTILITIES
   ============================================================ */

function showMessage(msg) {
  const c = document.getElementById("video-container");
  c.innerHTML = `<p style="padding:20px;">${msg}</p>`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   PLAYLIST SIDEBAR
   ============================================================ */

function renderPlaylistSidebar() {
  const listEl = document.getElementById("playlist-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  // All Favorites item
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

  const titleEl = document.getElementById("playlist-title");
  if (!titleEl) return;

  if (id === "all") {
    titleEl.textContent = "All My Favorites";
    window.renderVideos(allFavoriteVideos);
    decorateFavoriteCards(allFavoriteVideos);
    return;
  }

  const pl = playlists.find((p) => p.id === id);
  titleEl.textContent = pl ? pl.name : "Playlist";

  const ids = playlistVideosMap.get(id) || new Set();
  const filtered = allFavoriteVideos.filter((v) =>
    ids.has(v.Video_Lookup)
  );

  window.renderVideos(filtered);
  decorateFavoriteCards(filtered);

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* ============================================================
   DECORATE VIDEO CARDS
   ============================================================ */

function decorateFavoriteCards(videos) {
  const container = document.getElementById("video-container");
  if (!container) return;

  const cards = Array.from(
    container.querySelectorAll(".video-item, .carousel-video-item")
  );

  cards.forEach((card, index) => {
    const v = videos[index];
    if (!v) return;

    const videoId = v.Video_Lookup;
    card.dataset.videoId = videoId;

    const preview = card.querySelector(".preview-container");
    if (!preview) return;

    // remove existing playlist button if any
    const oldBtn = preview.querySelector(".playlist-btn");
    if (oldBtn) oldBtn.remove();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "playlist-btn";
    btn.dataset.videoId = videoId;
    btn.innerHTML = `<i data-lucide="plus"></i>`;
    preview.appendChild(btn);
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* ============================================================
   HANDLERS: SIDEBAR
   ============================================================ */

function attachPlaylistSidebarHandlers() {
  const listEl = document.getElementById("playlist-list");
  if (!listEl) return;

  listEl.addEventListener("click", (e) => {
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

/* ============================================================
   HANDLERS: "+" BUTTON ON VIDEO CARDS
   ============================================================ */

function attachPlaylistButtonHandlers() {
  if (playlistHandlersAttached) return;
  playlistHandlersAttached = true;

  const container = document.getElementById("video-container");
  if (!container) return;

  // Use capture phase so we intercept before card click opens the video
  container.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".playlist-btn");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation(); // stop card-click -> open video

      const videoId = btn.dataset.videoId;
      console.log("[my-favorites] + clicked for video:", videoId, "playlist:", currentPlaylistId);

      if (currentPlaylistId === "all") {
        openCreatePlaylistModal(videoId);
      } else {
        toggleVideoInPlaylist(videoId, currentPlaylistId, btn);
      }
    },
    true // CAPTURE PHASE
  );
}

/* ============================================================
   CREATE PLAYLIST GLASS MODAL
   ============================================================ */

function attachCreatePlaylistModalHandlers() {
  const overlay = document.getElementById("playlist-create-overlay");
  const cancelBtn = document.getElementById("playlist-cancel-btn");
  const saveBtn = document.getElementById("playlist-save-btn");

  if (!overlay || !cancelBtn || !saveBtn) return;

  cancelBtn.onclick = () => {
    overlay.style.display = "none";
    selectedVideoForPlaylist = null;
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.style.display = "none";
      selectedVideoForPlaylist = null;
    }
  });

  saveBtn.onclick = async () => {
    const input = document.getElementById("playlist-input");
    if (!input) return;
    const name = input.value.trim();
    if (!name || !selectedVideoForPlaylist) return;

    await saveVideoToNamedPlaylist(selectedVideoForPlaylist, name);

    overlay.style.display = "none";
    selectedVideoForPlaylist = null;
    applyPlaylistFilter(currentPlaylistId);
  };
}

function openCreatePlaylistModal(videoId) {
  const overlay = document.getElementById("playlist-create-overlay");
  const input = document.getElementById("playlist-input");
  if (!overlay || !input) return;

  selectedVideoForPlaylist = videoId;
  overlay.style.display = "flex";
  input.value = "";
  input.focus();
}

/* ============================================================
   SAVE VIDEO TO NAMED PLAYLIST
   ============================================================ */

async function saveVideoToNamedPlaylist(videoId, playlistName) {
  const normalized = playlistName.toLowerCase();
  let pl = playlists.find((p) => p.name.toLowerCase() === normalized);

  if (!pl) {
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        user_id: currentUser.id,
        name: playlistName,
      })
      .select()
      .single();

    if (error) {
      console.error("[my-favorites] Error creating playlist:", error);
      return;
    }

    pl = data;
    playlists.push(pl);
    renderPlaylistSidebar();

    currentPlaylistId = pl.id;
    const titleEl = document.getElementById("playlist-title");
    if (titleEl) titleEl.textContent = pl.name;
  }

  const { error: addErr } = await supabase
    .from("playlist_videos")
    .insert({
      user_id: currentUser.id,
      playlist_id: pl.id,
      video_id: videoId,
    });

  if (addErr) {
    console.error("[my-favorites] Error adding video to playlist:", addErr);
    return;
  }

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
  const cancelBtn = document.getElementById("rename-cancel-btn");

  if (!overlay || !input || !saveBtn || !cancelBtn) return;

  input.value = pl.name;
  overlay.style.display = "flex";
  input.focus();

  const cleanup = () => {
    overlay.style.display = "none";
    saveBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  saveBtn.onclick = async () => {
    const newName = input.value.trim();
    if (!newName) {
      cleanup();
      return;
    }

    const { error } = await supabase
      .from("playlists")
      .update({ name: newName })
      .eq("id", playlistId);

    if (error) {
      console.error("[my-favorites] Error renaming playlist:", error);
    } else {
      pl.name = newName;
      if (currentPlaylistId === playlistId) {
        const titleEl = document.getElementById("playlist-title");
        if (titleEl) titleEl.textContent = newName;
      }
      renderPlaylistSidebar();
    }

    cleanup();
  };

  cancelBtn.onclick = cleanup;
}

/* ============================================================
   DELETE PLAYLIST (GLASS MODAL)
   ============================================================ */

function openDeleteModal(playlistId) {
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;

  const overlay = document.getElementById("delete-modal-overlay");
  const confirmBtn = document.getElementById("delete-confirm-btn");
  const cancelBtn = document.getElementById("delete-cancel-btn");

  if (!overlay || !confirmBtn || !cancelBtn) return;

  overlay.style.display = "flex";

  const cleanup = () => {
    overlay.style.display = "none";
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  confirmBtn.onclick = async () => {
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId);

    if (error) {
      console.error("[my-favorites] Error deleting playlist:", error);
      cleanup();
      return;
    }

    playlists = playlists.filter((p) => p.id !== playlistId);
    playlistVideosMap.delete(playlistId);

    if (currentPlaylistId === playlistId) {
      currentPlaylistId = "all";
      const titleEl = document.getElementById("playlist-title");
      if (titleEl) titleEl.textContent = "All My Favorites";
      window.renderVideos(allFavoriteVideos);
      decorateFavoriteCards(allFavoriteVideos);
    }

    renderPlaylistSidebar();
    cleanup();
  };

  cancelBtn.onclick = cleanup;
}

/* ============================================================
   TOGGLE VIDEO IN CURRENT PLAYLIST
   ============================================================ */

async function toggleVideoInPlaylist(videoId, playlistId, btn) {
  let set = playlistVideosMap.get(playlistId) || new Set();

  if (set.has(videoId)) {
    // Remove from playlist
    const { error } = await supabase
      .from("playlist_videos")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("playlist_id", playlistId)
      .eq("video_id", videoId);

    if (error) {
      console.error("[my-favorites] Error removing video from playlist:", error);
      return;
    }

    set.delete(videoId);
    playlistVideosMap.set(playlistId, set);

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
  } else {
    // Add to playlist
    const { error } = await supabase
      .from("playlist_videos")
      .insert({
        user_id: currentUser.id,
        playlist_id: playlistId,
        video_id: videoId,
      });

    if (error) {
      console.error("[my-favorites] Error adding video to playlist:", error);
      return;
    }

    set.add(videoId);
    playlistVideosMap.set(playlistId, set);
  }
}
