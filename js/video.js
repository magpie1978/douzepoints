/**


import { supabase } from './supabaseClient.js';

/**
 * video.js — modal-only trigger + home carousels + multi-page routing
 

(function () {
  // ------------------------------------------------------------
  // UTILITIES
  // ------------------------------------------------------------
  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ------------------------------------------------------------
  // FAVOURITES: STATE + HELPERS
  // ------------------------------------------------------------
  let currentUser = null;
  let favoriteIds = new Set();
  let favoritesLoaded = false;

  /**
   * Derive a stable key for a video.
   * Adjust this if/when you add an explicit PK to douzepoints.
   
  function getVideoKey(entry) {
    return (
      entry.id ??
      entry.ID ??
      entry.Video_Lookup ??
      `${entry.Year || ''}-${entry.Country_Code || ''}-${entry.Artist || ''}-${entry.Song || ''}`
    );
  }

  async function ensureFavoritesLoaded() {
    if (favoritesLoaded) return;

    if (!supabase) {
      console.warn('[video.js] Supabase client missing – favourites disabled.');
      favoritesLoaded = true;
      return;
    }

    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) {
        currentUser = null;
        favoriteIds = new Set();
        favoritesLoaded = true;
        return;
      }

      currentUser = user;

      const { data, error } = await supabase
        .from('user_favorites')
        .select('video_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('[video.js] Error loading favourites:', error);
        favoriteIds = new Set();
      } else {
        favoriteIds = new Set((data || []).map(row => String(row.video_id)));
      }
    } catch (e) {
      console.error('[video.js] Exception loading favourites:', e);
      favoriteIds = new Set();
    } finally {
      favoritesLoaded = true;
    }
  }

  async function toggleFavorite(button, videoKey) {
    if (!supabase) {
      console.warn('[video.js] Supabase client missing – cannot toggle favourite.');
      return;
    }

    await ensureFavoritesLoaded();

    if (!currentUser) {
      alert('Please log in to save favourites.');
      return;
    }

    const keyStr = String(videoKey);

    // Already a favourite → remove it
    if (favoriteIds.has(keyStr)) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('video_id', keyStr);

      if (error) {
        console.error('[video.js] Error removing favourite:', error);
        return;
      }

      favoriteIds.delete(keyStr);
      button.classList.remove('is-favorite');
      return;
    }

    // Not yet a favourite → add it
    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: currentUser.id,
        video_id: keyStr
      });

    if (error) {
      console.error('[video.js] Error adding favourite:', error);
      return;
    }

    favoriteIds.add(keyStr);
    button.classList.add('is-favorite');
  }

  // ------------------------------------------------------------
  // MODAL WRAPPER (strict)
  // ------------------------------------------------------------
  function openModalStrict(videoUrl, entry) {
    if (!videoUrl) {
      console.error('[video.js] No Video_URL found:', entry);
      return;
    }

    if (typeof window.openVideoModal === 'function') {
      try {
        window.openVideoModal({ url: videoUrl, entry });
        return;
      } catch (_) {
        try { window.openVideoModal(videoUrl, entry); return; } catch (_) {}
        try { window.openVideoModal(videoUrl); return; } catch (_) {}
      }
    }

    if (typeof window.showVideoModal === 'function') {
      try { window.showVideoModal(videoUrl, entry); return; } catch (_) {}
    }
    if (typeof window.openModal === 'function') {
      try { window.openModal(videoUrl, entry); return; } catch (_) {}
    }

    console.error('[video.js] No modal function found.');
  }

  // ------------------------------------------------------------
  // RENDER ONE CARD (grid or carousel)
  // ------------------------------------------------------------
  function renderEntry(entry, variant = 'grid') {
    const wrapper = document.createElement('div');
    wrapper.className = (variant === 'carousel') ? 'carousel-video-item' : 'video-item';
    wrapper.setAttribute('role', 'button');
    wrapper.tabIndex = 0;

    const videoKey = getVideoKey(entry);
    const isFavorite = favoriteIds.has(String(videoKey));

    // Points & ranks
    const totalPoints    = Number(entry.Final_TotalPoints)     || 0;
    const juryPoints     = Number(entry.Final_JuryPoints)      || 0;
    const televotePoints = Number(entry.Final_TelevotePoints)  || 0;
    const totalRank      = Number(entry.Final_Rank)            || 0;
    const juryRank       = Number(entry.Final_JuryRank)        || 0;
    const televoteRank   = Number(entry.Final_TelevoteRank)    || 0;

    // DNQ
    const dnq = (
      !entry.Final_Rank ||
      Number(entry.Final_Rank) === 0 ||
      String(entry.QualifiedFinal || '').toUpperCase() === 'N'
    );

    // Sorting data attributes (used only on grid pages, but harmless on carousels)
    wrapper.dataset.total        = String(totalPoints);
    wrapper.dataset.jury         = String(juryPoints);
    wrapper.dataset.televote     = String(televotePoints);
    wrapper.dataset.totalrank    = String(totalRank);
    wrapper.dataset.juryrank     = String(juryRank);
    wrapper.dataset.televoterank = String(televoteRank);
    wrapper.dataset.dnq          = dnq ? '1' : '0';

    if (entry.Year)    wrapper.dataset.year = entry.Year;
    if (entry.Artist)  wrapper.dataset.artist = entry.Artist.toLowerCase();
    if (entry.Song)    wrapper.dataset.song = entry.Song.toLowerCase();
    if (entry.Country) wrapper.dataset.country = entry.Country.toLowerCase();

    // Visuals
    const countryCode = entry.Country_Code?.toLowerCase();
    const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
    const flagUrl = `/flags/${countryCode}.png`;
    const videoUrl = entry.Video_URL;

    const titleHTML = `
      <div class="title-line">
        <div class="title-artist">${escapeHTML(entry.Artist || '')}</div>
        <div class="title-song">${escapeHTML(entry.Song || '')}</div>
      </div>
      <div class="title-meta">
        <span class="title-country">${escapeHTML(entry.Country || '')}</span>
        ${entry.Year ? `<span class="title-year">${escapeHTML(entry.Year)}</span>` : ''}
      </div>
    `;

    const rankDisplay   = dnq ? 'NQ' : totalRank;
    const pointsDisplay = dnq ? 'NQ' : totalPoints;
    const rankClass     = dnq ? 'score-circle dnq score-pos' : 'score-circle score-pos';
    const pointsClass   = dnq ? 'score-circle dnq score-pts' : 'score-circle score-pts';

    wrapper.innerHTML = `
      <div class="preview-container" data-video-url="${escapeHTML(videoUrl || '')}">
        <button
          class="favorite-btn ${isFavorite ? 'is-favorite' : ''}"
          data-video-key="${escapeHTML(String(videoKey))}"
          aria-label="Toggle favourite"
        >
          <i data-lucide="heart"></i>
        </button>

        <img class="thumbnail" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(entry.Artist || '')}" />
      </div>

      <div class="video-title-with-icon" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <a href="country.html?country=${encodeURIComponent(entry.Country || '')}" onclick="event.stopPropagation()">
            <img class="flag-icon" src="${escapeHTML(flagUrl)}" alt="Flag" />
          </a>
          <div class="video-title-text">${titleHTML}</div>
        </div>

        ${
          variant === 'carousel'
            ? '' // ⛔ no Pos/Pts or circles in carousels
            : `
              <div class="score-wrapper">
                <table class="score-table">
                  <tr><th>Pos</th><th>Pts</th></tr>
                  <tr>
                    <td><div class="${rankClass}">${escapeHTML(String(rankDisplay))}</div></td>
                    <td><div class="${pointsClass}">${escapeHTML(String(pointsDisplay))}</div></td>
                  </tr>
                </table>
              </div>
            `
        }
      </div>
    `;

    // Modal triggers
    const open = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      openModalStrict(videoUrl, entry);
    };

    wrapper.addEventListener('click', open);
    wrapper.querySelector('.thumbnail')?.addEventListener('click', open);
    wrapper.querySelector('.preview-container')?.addEventListener('click', open);

    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(e);
      }
    });

    // Favourite button behaviour
    const favBtn = wrapper.querySelector('.favorite-btn');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(favBtn, videoKey);
      });
    }

    return wrapper;
  }

  // ------------------------------------------------------------
  // RENDERING (GRID PAGES)
  // ------------------------------------------------------------
  function renderVideos(entries) {
    const container = document.getElementById('video-container');
    if (!container) return;
    container.innerHTML = '';

    const frag = document.createDocumentFragment();
    entries.forEach(entry => frag.appendChild(renderEntry(entry, 'grid')));
    container.appendChild(frag);

    // Refresh Lucide icons (for the heart)
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    if (window.triggerInitialSort) window.triggerInitialSort();
  }

  // ------------------------------------------------------------
  // RENDERING (CAROUSELS)
  // ------------------------------------------------------------
  function renderIntoCarousel(trackId, entries) {
    const track = document.getElementById(trackId);
    if (!track) return;

    track.innerHTML = '';
    const frag = document.createDocumentFragment();
    entries.forEach(entry => frag.appendChild(renderEntry(entry, 'carousel')));
    track.appendChild(frag);

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // ------------------------------------------------------------
  // FETCH WRAPPER
  // ------------------------------------------------------------
  async function fetchAndRender(queryFn, errorMsg, emptyMsg) {
    const container = document.getElementById('video-container');

    if (!supabase) {
      console.error('[video.js] Supabase missing.');
      return;
    }

    // Make sure we know favourites & user before rendering
    await ensureFavoritesLoaded();

    const { data, error } = await queryFn(supabase);
    if (error) {
      console.error(errorMsg, error);
      if (container) container.innerHTML = `<p style="padding:16px">${escapeHTML(errorMsg)}</p>`;
      return;
    }
    if (!data || data.length === 0) {
      if (container) container.innerHTML = `<p style="padding:16px">${escapeHTML(emptyMsg)}</p>`;
      return;
    }

    renderVideos(data);
  }

  // ------------------------------------------------------------
  // PAGE LOADERS
  // ------------------------------------------------------------

  // Country.html
  function loadCountry() {
    const country = getQueryParam('country');
    const container = document.getElementById('video-container');

    if (!country) {
      if (container) {
        container.innerHTML = `<p style="padding:16px">No country specified. Add <code>?country=Sweden</code>.</p>`;
      }
      return;
    }

    return fetchAndRender(
      (supa) => supa
        .from('douzepoints')
        .select('*')
        .ilike('Country', country)
        .order('Year', { ascending: false }),
      `Error loading ${country}`,
      `No entries for ${country}.`
    );
  }

  // Edition.html
  function loadEdition() {
    const edition = getQueryParam('edition');
    const container = document.getElementById('video-container');

    if (!edition) {
      if (container) container.innerHTML = `<p style="padding:16px">Add <code>?edition=2024</code>.</p>`;
      return;
    }

    return fetchAndRender(
      (supa) => supa
        .from('douzepoints')
        .select('*')
        .eq('Year', edition)
        .order('Final_Rank', { ascending: true }),
      `Error loading edition ${edition}`,
      `No entries for ${edition}.`
    );
  }

  // Winners.html
  function loadWinners() {
    return fetchAndRender(
      (supa) => supa
        .from('douzepoints')
        .select('*')
        .eq('Final_Rank', 1)
        .order('Year', { ascending: false }),
      'Error loading winners',
      'No winners found.'
    );
  }

  // Fan-favorites.html  (FanFave = 'Y')
  function loadFanFavorites() {
    return fetchAndRender(
      (supa) =>
        supa
          .from('douzepoints')
          .select('*')
          .eq('FanFave', 'Y')
          .order('Year', { ascending: false }),
      'Error loading fan favourites',
      'No fan favourites found.'
    );
  }

  // ------------------------------------------------------------
  // HOME PAGE (index.html) — FOUR CAROUSELS
  // ------------------------------------------------------------
  async function loadHome() {
    if (!supabase) return;

    // So hearts in carousels also reflect current favourites
    await ensureFavoritesLoaded();

    const track1 = document.getElementById('carouselTrack1'); // Winners
    const track2 = document.getElementById('carouselTrack2'); // 2024 Malmö
    const track3 = document.getElementById('carouselTrack3'); // Fan Favourites
    const track4 = document.getElementById('carouselTrack4'); // 2025 Basel

    try {
      const tasks = [];

      // Winners carousel
      if (track1) {
        tasks.push(
          supabase.from('douzepoints')
            .select('*')
            .eq('Final_Rank', 1)
            .order('Year', { ascending: false })
            .limit(40)
            .then(({ data, error }) => {
              if (!error) renderIntoCarousel('carouselTrack1', data || []);
            })
        );
      }

      // Basel 2025
      if (track4) {
        tasks.push(
          supabase.from('douzepoints')
            .select('*')
            .eq('Year', 2025)
            .order('Final_Rank', { ascending: true })
            .then(({ data, error }) => {
              if (!error) renderIntoCarousel('carouselTrack4', data || []);
            })
        );
      }

      // Malmö 2024
      if (track2) {
        tasks.push(
          supabase.from('douzepoints')
            .select('*')
            .eq('Year', 2024)
            .order('Final_Rank', { ascending: true })
            .then(({ data, error }) => {
              if (!error) renderIntoCarousel('carouselTrack2', data || []);
            })
        );
      }

      // Fan Favourites
      if (track3) {
        tasks.push(
          supabase.from('douzepoints')
            .select('*')
            .eq('FanFave', 'Y')
            .order('Year', { ascending: false })
            .then(({ data, error }) => {
              if (!error) renderIntoCarousel('carouselTrack3', data || []);
            })
        );
      }

      await Promise.all(tasks);
    } catch (e) {
      console.error('Home carousel load error:', e);
    }
  }

  // ------------------------------------------------------------
  // CAROUSEL SCROLLING
  // ------------------------------------------------------------
  window.scrollCarousel = function (direction, trackId) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const container = track.parentElement;
    const card = track.querySelector('.carousel-video-item') || track.querySelector('.video-item');

    const cardWidth = card ? card.getBoundingClientRect().width + 30 : 260;
    const scrollAmount = direction * cardWidth * 4;

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  // ------------------------------------------------------------
  // PAGE ROUTING
  // ------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.endsWith('/') || path.endsWith('index.html') || path.includes('index.html')) {
      loadHome();
    } else if (path.includes('country.html')) {
      loadCountry();
    } else if (path.includes('edition.html')) {
      loadEdition();
    } else if (path.includes('winners.html')) {
      loadWinners();
    } else if (path.includes('fan-favorites.html')) {
      loadFanFavorites();
    }
  });

  // Expose manual renderer
  window.renderVideos = renderVideos;
})();



/**
 * video.js — now using ONE global supabase client everywhere
 * (window.supabaseClient)
 *

const supabase = window.supabaseClient;   // ⭐ IMPORTANT FIX

(function () {
  // ------------------------------------------------------------
  // UTILITIES
  // ------------------------------------------------------------
  function escapeHTML(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ------------------------------------------------------------
  // FAVOURITES STATE
  // ------------------------------------------------------------
  let currentUser = null;
  let favoriteIds = new Set();
  let favoritesLoaded = false;

  function getVideoKey(entry) {
    return (
      entry.id ??
      entry.ID ??
      entry.Video_Lookup ??
      `${entry.Year || ""}-${entry.Country_Code || ""}-${entry.Artist || ""}-${entry.Song || ""}`
    );
  }

  async function ensureFavoritesLoaded() {
    if (favoritesLoaded) return;

    if (!supabase) {
      console.warn("[video.js] supabase missing");
      favoritesLoaded = true;
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;

    if (!user) {
      currentUser = null;
      favoriteIds = new Set();
      favoritesLoaded = true;
      return;
    }

    currentUser = user;

    const { data, error } = await supabase
      .from("user_favorites")
      .select("video_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Load favourites error:", error);
      favoriteIds = new Set();
    } else {
      favoriteIds = new Set((data || []).map((r) => String(r.video_id)));
    }

    favoritesLoaded = true;
  }

  async function toggleFavorite(button, videoKey) {
    await ensureFavoritesLoaded();

    if (!currentUser) {
      alert("Please log in to save favourites.");
      return;
    }

    const vid = String(videoKey);

    // REMOVE
    if (favoriteIds.has(vid)) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("video_id", vid);

      if (error) return console.error("Error removing:", error);

      favoriteIds.delete(vid);
      button.classList.remove("is-favorite");
      return;
    }

    // ADD
    const { error } = await supabase
      .from("user_favorites")
      .insert({ user_id: currentUser.id, video_id: vid });

    if (error) return console.error("Error adding:", error);

    favoriteIds.add(vid);
    button.classList.add("is-favorite");
  }

  // ------------------------------------------------------------
  // MODAL CALL
  // ------------------------------------------------------------
  function openModalStrict(videoUrl, entry) {
    if (!videoUrl) {
      console.error("No video URL", entry);
      return;
    }

    if (typeof window.openVideoModal === "function") {
      try {
        window.openVideoModal({ url: videoUrl, entry });
        return;
      } catch (_) {}
    }

    console.error("No modal function found.");
  }

  // ------------------------------------------------------------
  // CREATE A VIDEO CARD
  // ------------------------------------------------------------
  function renderEntry(entry, variant = "grid") {
    const wrapper = document.createElement("div");
    wrapper.className = variant === "carousel" ? "carousel-video-item" : "video-item";
    wrapper.setAttribute("role", "button");
    wrapper.tabIndex = 0;

    const videoKey = getVideoKey(entry);

    const isFav = favoriteIds.has(String(videoKey));

    const countryCode = entry.Country_Code?.toLowerCase() || "";
    const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
    const videoUrl = entry.Video_URL;
    const flagUrl = `/flags/${countryCode}.png`;

    wrapper.innerHTML = `
      <div class="preview-container" data-video-url="${escapeHTML(videoUrl || "")}">
        <button
          class="favorite-btn ${isFav ? "is-favorite" : ""}"
          data-video-key="${escapeHTML(String(videoKey))}"
          aria-label="Toggle favourite"
        >
          <i data-lucide="heart"></i>
        </button>

        <img class="thumbnail" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(entry.Artist || "")}">
      </div>

      <div class="video-title-with-icon" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <a href="country.html?country=${encodeURIComponent(entry.Country || "")}" onclick="event.stopPropagation()">
            <img class="flag-icon" src="${escapeHTML(flagUrl)}" alt="Flag">
          </a>
          <div class="video-title-text">
            <div class="title-line">
              <div class="title-artist">${escapeHTML(entry.Artist || "")}</div>
              <div class="title-song">${escapeHTML(entry.Song || "")}</div>
            </div>
            <div class="title-meta">
              <span class="title-country">${escapeHTML(entry.Country || "")}</span>
              ${entry.Year ? `<span class="title-year">${escapeHTML(entry.Year)}</span>` : ""}
            </div>
          </div>
        </div>

        ${
          variant === "carousel"
            ? ""
            : `
            <div class="score-wrapper">
              <table class="score-table">
                <tr><th>Pos</th><th>Pts</th></tr>
                <tr>
                  <td><div class="score-circle">${escapeHTML(String(entry.Final_Rank || "NQ"))}</div></td>
                  <td><div class="score-circle">${escapeHTML(String(entry.Final_TotalPoints || "NQ"))}</div></td>
                </tr>
              </table>
            </div>
          `
        }
      </div>
    `;

    // OPEN MODAL
    const open = (e) => {
      e.stopPropagation();
      e.preventDefault();
      openModalStrict(videoUrl, entry);
    };

    wrapper.addEventListener("click", open);
    wrapper.querySelector(".thumbnail")?.addEventListener("click", open);
    wrapper.querySelector(".preview-container")?.addEventListener("click", open);

    // FAV BUTTON
    const favBtn = wrapper.querySelector(".favorite-btn");
    favBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(favBtn, videoKey);
    });

    return wrapper;
  }

  // ------------------------------------------------------------
  // RENDER GRID
  // ------------------------------------------------------------
  function renderVideos(entries) {
    const container = document.getElementById("video-container");
    if (!container) return;

    container.innerHTML = "";

    const frag = document.createDocumentFragment();
    entries.forEach((entry) => frag.appendChild(renderEntry(entry, "grid")));
    container.appendChild(frag);

    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  function renderIntoCarousel(trackId, entries) {
    const track = document.getElementById(trackId);
    if (!track) return;

    track.innerHTML = "";

    const frag = document.createDocumentFragment();
    entries.forEach((entry) => frag.appendChild(renderEntry(entry, "carousel")));
    track.appendChild(frag);

    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  // ------------------------------------------------------------
  // FETCH WRAPPER
  // ------------------------------------------------------------
  async function fetchAndRender(queryFn) {
    await ensureFavoritesLoaded();

    const { data, error } = await queryFn(supabase);
    if (error) {
      console.error("Fetch error:", error);
      return;
    }

    renderVideos(data);
  }

  // ------------------------------------------------------------
  // PAGE LOADERS
  // ------------------------------------------------------------
  function loadEdition() {
    const year = getQueryParam("edition");
    if (!year) return;

    fetchAndRender((supa) =>
      supa.from("douzepoints").select("*").eq("Year", year).order("Final_Rank", { ascending: true })
    );
  }

  function loadCountry() {
    const c = getQueryParam("country");
    if (!c) return;

    fetchAndRender((supa) =>
      supa.from("douzepoints").select("*").ilike("Country", c).order("Year", { ascending: false })
    );
  }

  function loadWinners() {
    fetchAndRender((supa) =>
      supa.from("douzepoints").select("*").eq("Final_Rank", 1).order("Year", { ascending: false })
    );
  }

  function loadFanFavorites() {
    fetchAndRender((supa) =>
      supa.from("douzepoints").select("*").eq("FanFave", "Y").order("Year", { ascending: false })
    );
  }

  async function loadHome() {
    await ensureFavoritesLoaded();

    const car1 = document.getElementById("carouselTrack1");
    const car2 = document.getElementById("carouselTrack2");
    const car3 = document.getElementById("carouselTrack3");
    const car4 = document.getElementById("carouselTrack4");

    if (car1)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Final_Rank", 1)
        .order("Year", { ascending: false })
        .then(({ data }) => renderIntoCarousel("carouselTrack1", data || []));

    if (car2)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", 2024)
        .order("Final_Rank", { ascending: true })
        .then(({ data }) => renderIntoCarousel("carouselTrack2", data || []));

    if (car3)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("FanFave", "Y")
        .order("Year", { ascending: false })
        .then(({ data }) => renderIntoCarousel("carouselTrack3", data || []));

    if (car4)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", 2025)
        .order("Final_Rank", { ascending: true })
        .then(({ data }) => renderIntoCarousel("carouselTrack4", data || []));
  }

  // ------------------------------------------------------------
  // ROUTING
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname;

    if (path.includes("edition.html")) loadEdition();
    else if (path.includes("country.html")) loadCountry();
    else if (path.includes("winners.html")) loadWinners();
    else if (path.includes("fan-favorites.html")) loadFanFavorites();
    else if (path.includes("index.html") || path === "/") loadHome();
  });

  window.renderVideos = renderVideos;
})();


/**
 * video.js — FINAL VERSION (2025)
 * ✔ Uses window.supabaseClient
 * ✔ Favourite system working end-to-end
 * ✔ Modern Video_Lookup normalization (ignores 1956 oddities)
 

const supabase = window.supabaseClient;   // ⭐ use global supabase client

(function () {
  // ------------------------------------------------------------
  // UTILS
  // ------------------------------------------------------------
  function escapeHTML(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ------------------------------------------------------------
  // FAVOURITES STATE
  // ------------------------------------------------------------
  let currentUser = null;
  let favoriteIds = new Set();
  let favoritesLoaded = false;

  /**
   * ⭐ Get unique favourite key
   * Always derived from Video_Lookup, normalized.
   
  function getVideoKey(entry) {
    let key = entry.Video_Lookup;
    if (!key) return null;

    // ⭐ Normalize 1950s weird format (e.g. "1956_1-BE.mp4" → "1956-BE.mp4")
    const match = key.match(/^(\d{4})_\d+-([A-Z]{2})\.mp4$/i);
    if (match) {
      const year = match[1];
      const cc = match[2].toUpperCase();
      return `${year}-${cc}.mp4`;
    }

    return key;
  }

  async function ensureFavoritesLoaded() {
    if (favoritesLoaded) return;

    if (!supabase) {
      console.warn("[video.js] No supabase client!");
      favoritesLoaded = true;
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;

    if (!user) {
      currentUser = null;
      favoriteIds = new Set();
      favoritesLoaded = true;
      return;
    }

    currentUser = user;

    const { data: favRows, error } = await supabase
      .from("user_favorites")
      .select("video_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("[video.js] error loading favourites:", error);
      favoriteIds = new Set();
    } else {
      favoriteIds = new Set((favRows || []).map(r => String(r.video_id)));
    }

    favoritesLoaded = true;
  }

  async function toggleFavorite(button, videoKey) {
    await ensureFavoritesLoaded();

    if (!currentUser) {
      alert("Please log in to save favourites.");
      return;
    }

    const key = String(videoKey);

    // REMOVE
    if (favoriteIds.has(key)) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("video_id", key);

      if (error) {
        console.error("Error removing favourite:", error);
        return;
      }

      favoriteIds.delete(key);
      button.classList.remove("is-favorite");
      return;
    }

    // ADD
    const { error } = await supabase
      .from("user_favorites")
      .insert({
        user_id: currentUser.id,
        video_id: key
      });

    if (error) {
      console.error("Error adding favourite:", error);
      return;
    }

    favoriteIds.add(key);
    button.classList.add("is-favorite");
  }

  // ------------------------------------------------------------
  // MODAL WRAPPER
  // ------------------------------------------------------------
  function openModalStrict(videoUrl, entry) {
    if (!videoUrl) {
      console.error("[video.js] No video URL", entry);
      return;
    }

    if (typeof window.openVideoModal === "function") {
      try {
        window.openVideoModal({ url: videoUrl, entry });
        return;
      } catch (_) {}
    }

    console.error("[video.js] No modal function found.");
  }

  // ------------------------------------------------------------
  // RENDER A SINGLE VIDEO ENTRY
  // ------------------------------------------------------------
  function renderEntry(entry, variant = "grid") {
    const wrapper = document.createElement("div");
    wrapper.className = variant === "carousel" ? "carousel-video-item" : "video-item";
    wrapper.setAttribute("role", "button");
    wrapper.tabIndex = 0;

    const videoKey = getVideoKey(entry);
    const isFav = favoriteIds.has(String(videoKey));

    const countryCode = entry.Country_Code?.toLowerCase() || "";
    const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
    const videoUrl = entry.Video_URL;
    const flagUrl = `/flags/${countryCode}.png`;

    wrapper.innerHTML = `
      <div class="preview-container" data-video-url="${escapeHTML(videoUrl || "")}">

        <button
          class="favorite-btn ${isFav ? "is-favorite" : ""}"
          data-video-key="${escapeHTML(String(videoKey))}"
          aria-label="Toggle favourite"
        >
          <i data-lucide="heart"></i>
        </button>

        <img class="thumbnail" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(entry.Artist || "")}">
      </div>

      <div class="video-title-with-icon" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <a href="country.html?country=${encodeURIComponent(entry.Country || "")}" onclick="event.stopPropagation()">
            <img class="flag-icon" src="${escapeHTML(flagUrl)}" alt="Flag">
          </a>
          <div class="video-title-text">
            <div class="title-line">
              <div class="title-artist">${escapeHTML(entry.Artist || "")}</div>
              <div class="title-song">${escapeHTML(entry.Song || "")}</div>
            </div>
            <div class="title-meta">
              <span class="title-country">${escapeHTML(entry.Country || "")}</span>
              ${entry.Year ? `<span class="title-year">${escapeHTML(entry.Year)}</span>` : ""}
            </div>
          </div>
        </div>

        ${
          variant === "carousel"
            ? ""
            : `
            <div class="score-wrapper">
              <table class="score-table">
                <tr><th>Pos</th><th>Pts</th></tr>
                <tr>
                  <td><div class="score-circle">${escapeHTML(String(entry.Final_Rank || "NQ"))}</div></td>
                  <td><div class="score-circle">${escapeHTML(String(entry.Final_TotalPoints || "NQ"))}</div></td>
                </tr>
              </table>
            </div>
          `
        }
      </div>
    `;

    // OPEN MODAL
    const open = (e) => {
      e.stopPropagation();
      e.preventDefault();
      openModalStrict(videoUrl, entry);
    };

    wrapper.addEventListener("click", open);
    wrapper.querySelector(".thumbnail")?.addEventListener("click", open);
    wrapper.querySelector(".preview-container")?.addEventListener("click", open);

    // FAV BUTTON
    const favBtn = wrapper.querySelector(".favorite-btn");
    favBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(favBtn, videoKey);
    });

    return wrapper;
  }

  // ------------------------------------------------------------
  // RENDER GRID
  // ------------------------------------------------------------
  function renderVideos(entries) {
    const container = document.getElementById("video-container");
    if (!container) return;

    container.innerHTML = "";
    const frag = document.createDocumentFragment();

    entries.forEach((entry) => frag.appendChild(renderEntry(entry, "grid")));
    container.appendChild(frag);

    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  // ------------------------------------------------------------
  // RENDER CAROUSEL
  // ------------------------------------------------------------
  function renderIntoCarousel(trackId, entries) {
    const track = document.getElementById(trackId);
    if (!track) return;

    track.innerHTML = "";
    const frag = document.createDocumentFragment();

    entries.forEach((entry) => frag.appendChild(renderEntry(entry, "carousel")));
    track.appendChild(frag);

    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  // ------------------------------------------------------------
  // FETCH WRAPPER
  // ------------------------------------------------------------
  async function fetchAndRender(queryFn) {
    await ensureFavoritesLoaded();
    const { data, error } = await queryFn(supabase);

    if (error) {
      console.error("Fetch error:", error);
      return;
    }

    renderVideos(data);
  }

  // ------------------------------------------------------------
  // PAGE LOADERS
  // ------------------------------------------------------------
  function loadEdition() {
    const year = getQueryParam("edition");
    if (!year) return;

    fetchAndRender((s) =>
      s.from("douzepoints").select("*").eq("Year", year).order("Final_Rank", { ascending: true })
    );
  }

  function loadCountry() {
    const c = getQueryParam("country");
    if (!c) return;

    fetchAndRender((s) =>
      s.from("douzepoints").select("*").ilike("Country", c).order("Year", { ascending: false })
    );
  }

  function loadWinners() {
    fetchAndRender((s) =>
      s.from("douzepoints").select("*").eq("Final_Rank", 1).order("Year", { ascending: false })
    );
  }

  function loadFanFavorites() {
    fetchAndRender((s) =>
      s.from("douzepoints").select("*").eq("FanFave", "Y").order("Year", { ascending: false })
    );
  }

  async function loadHome() {
    await ensureFavoritesLoaded();

    const car1 = document.getElementById("carouselTrack1");
    const car2 = document.getElementById("carouselTrack2");
    const car3 = document.getElementById("carouselTrack3");
    const car4 = document.getElementById("carouselTrack4");

    if (car1)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Final_Rank", 1)
        .order("Year", { ascending: false })
        .limit(40)
        .then(({ data }) => renderIntoCarousel("carouselTrack1", data || []));

    if (car2)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", 2024)
        .order("Final_Rank", { ascending: true })
        .then(({ data }) => renderIntoCarousel("carouselTrack2", data || []));

    if (car3)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("FanFave", "Y")
        .order("Year", { ascending: false })
        .then(({ data }) => renderIntoCarousel("carouselTrack3", data || []));

    if (car4)
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", 2025)
        .order("Final_Rank", { ascending: true })
        .then(({ data }) => renderIntoCarousel("carouselTrack4", data || []));
  }

  // ------------------------------------------------------------
  // ROUTING
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("edition.html")) loadEdition();
    else if (path.includes("country.html")) loadCountry();
    else if (path.includes("winners.html")) loadWinners();
    else if (path.includes("fan-favorites.html")) loadFanFavorites();
    else if (path.includes("index.html") || path === "/") loadHome();
  });

  // Expose renderer
  window.renderVideos = renderVideos;
})();


/**
 * video.js — FINAL
 * - Uses global supabase client: window.supabaseClient
 * - Supports favourites via user_favorites table
 * - Renders grids & carousels
 * - Does NOT override my-favorites.html
 */

const supabase = window.supabaseClient || null;

(function () {
  // ------------------------------------------------------------
  // UTILITIES
  // ------------------------------------------------------------
  function escapeHTML(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ------------------------------------------------------------
  // FAVOURITES STATE
  // ------------------------------------------------------------
  let currentUser = null;
  let favoriteIds = new Set();
  let favoritesLoaded = false;

  /**
   * Get stable favourite key for a video.
   * Uses Video_Lookup directly (e.g. "1958-DK.mp4").
   * If you ever keep odd legacy formats, add normalization here.
   */
  function getVideoKey(entry) {
    return entry.Video_Lookup || null;
  }

  async function ensureFavoritesLoaded() {
    if (favoritesLoaded) return;

    if (!supabase) {
      console.warn("[video.js] supabase client missing – favourites disabled.");
      favoritesLoaded = true;
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;

    if (!user) {
      currentUser = null;
      favoriteIds = new Set();
      favoritesLoaded = true;
      return;
    }

    currentUser = user;

    const { data: favRows, error } = await supabase
      .from("user_favorites")
      .select("video_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("[video.js] error loading favourites:", error);
      favoriteIds = new Set();
    } else {
      favoriteIds = new Set((favRows || []).map(r => String(r.video_id)));
    }

    favoritesLoaded = true;
  }

  async function toggleFavorite(button, videoKey) {
    if (!supabase) {
      console.warn("[video.js] supabase missing – cannot toggle favourites.");
      return;
    }

    await ensureFavoritesLoaded();

    if (!currentUser) {
      alert("Please log in to save favourites.");
      return;
    }

    const key = String(videoKey);

    // Remove if already favourited
    if (favoriteIds.has(key)) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("video_id", key);

      if (error) {
        console.error("Error removing favourite:", error);
        return;
      }

      favoriteIds.delete(key);
      button.classList.remove("is-favorite");
      return;
    }

    // Add new favourite
    const { error } = await supabase
      .from("user_favorites")
      .insert({
        user_id: currentUser.id,
        video_id: key
      });

    if (error) {
      console.error("Error adding favourite:", error);
      return;
    }

    favoriteIds.add(key);
    button.classList.add("is-favorite");
  }

  // ------------------------------------------------------------
  // MODAL WRAPPER
  // ------------------------------------------------------------
  function openModalStrict(videoUrl, entry) {
    if (!videoUrl) {
      console.error("[video.js] No Video_URL found:", entry);
      return;
    }

    if (typeof window.openVideoModal === "function") {
      try {
        // Your modal expects an object in many places
        window.openVideoModal({ url: videoUrl, entry });
        return;
      } catch (e) {
        console.error("[video.js] Error calling openVideoModal:", e);
      }
    }

    console.error("[video.js] No modal function found.");
  }

  // ------------------------------------------------------------
  // RENDER A SINGLE VIDEO CARD
  // ------------------------------------------------------------
  function renderEntry(entry, variant = "grid") {
    const wrapper = document.createElement("div");
    wrapper.className = variant === "carousel" ? "carousel-video-item" : "video-item";
    wrapper.setAttribute("role", "button");
    wrapper.tabIndex = 0;

    const videoKey = getVideoKey(entry);
    const isFavorite = videoKey && favoriteIds.has(String(videoKey));

    const countryCode = entry.Country_Code?.toLowerCase() || "";
    const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
    const videoUrl = entry.Video_URL;
    const flagUrl = `/flags/${countryCode}.png`;

    // DNQ logic for scores
    const finalRank = entry.Final_Rank;
    const finalPoints = entry.Final_TotalPoints;
    const qualifiedFlag = String(entry.QualifiedFinal || "").toUpperCase();
    const isDNQ =
      !finalRank ||
      Number(finalRank) === 0 ||
      qualifiedFlag === "N";

    const rankDisplay = isDNQ ? "NQ" : finalRank;
    const pointsDisplay = isDNQ ? "NQ" : finalPoints;
    const rankClass = isDNQ ? "score-circle dnq score-pos" : "score-circle score-pos";
    const pointsClass = isDNQ ? "score-circle dnq score-pts" : "score-circle score-pts";

    wrapper.innerHTML = `
      <div class="preview-container" data-video-url="${escapeHTML(videoUrl || "")}">
        <button
          class="favorite-btn ${isFavorite ? "is-favorite" : ""}"
          data-video-key="${escapeHTML(String(videoKey || ""))}"
          aria-label="Toggle favourite"
        >
          <i data-lucide="heart"></i>
        </button>

        <img class="thumbnail" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(entry.Artist || "")}">
      </div>

      <div class="video-title-with-icon" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <a href="country.html?country=${encodeURIComponent(entry.Country || "")}" onclick="event.stopPropagation()">
            <img class="flag-icon" src="${escapeHTML(flagUrl)}" alt="Flag">
          </a>
          <div class="video-title-text">
            <div class="title-line">
              <div class="title-artist">${escapeHTML(entry.Artist || "")}</div>
              <div class="title-song">${escapeHTML(entry.Song || "")}</div>
            </div>
            <div class="title-meta">
              <span class="title-country">${escapeHTML(entry.Country || "")}</span>
              ${entry.Year ? `<span class="title-year">${escapeHTML(entry.Year)}</span>` : ""}
            </div>
          </div>
        </div>

        ${
          variant === "carousel"
            ? ""
            : `
            <div class="score-wrapper">
              <table class="score-table">
                <tr><th>Pos</th><th>Pts</th></tr>
                <tr>
                  <td><div class="${rankClass}">${escapeHTML(String(rankDisplay || ""))}</div></td>
                  <td><div class="${pointsClass}">${escapeHTML(String(pointsDisplay || ""))}</div></td>
                </tr>
              </table>
            </div>
          `
        }
      </div>
    `;

    // Open modal on click
    const open = (e) => {
      e.stopPropagation();
      e.preventDefault();
      openModalStrict(videoUrl, entry);
    };

    wrapper.addEventListener("click", open);
    wrapper.querySelector(".thumbnail")?.addEventListener("click", open);
    wrapper.querySelector(".preview-container")?.addEventListener("click", open);

    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(e);
      }
    });

    // Favourite button
    const favBtn = wrapper.querySelector(".favorite-btn");
    if (favBtn && videoKey) {
      favBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(favBtn, videoKey);
      });
    }

    return wrapper;
  }

  // ------------------------------------------------------------
  // RENDER GRID
  // ------------------------------------------------------------
  function renderVideos(entries) {
    const container = document.getElementById("video-container");
    if (!container) return;

    container.innerHTML = "";
    const frag = document.createDocumentFragment();

    entries.forEach(entry => {
      frag.appendChild(renderEntry(entry, "grid"));
    });

    container.appendChild(frag);

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  // ------------------------------------------------------------
  // RENDER CAROUSEL
  // ------------------------------------------------------------
  function renderIntoCarousel(trackId, entries) {
    const track = document.getElementById(trackId);
    if (!track) return;

    track.innerHTML = "";
    const frag = document.createDocumentFragment();

    entries.forEach(entry => {
      frag.appendChild(renderEntry(entry, "carousel"));
    });

    track.appendChild(frag);

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  // ------------------------------------------------------------
  // FETCH WRAPPER FOR GRID PAGES
  // ------------------------------------------------------------
  async function fetchAndRender(queryFn) {
    if (!supabase) {
      console.error("[video.js] supabase client not available.");
      return;
    }

    await ensureFavoritesLoaded();

    const { data, error } = await queryFn(supabase);
    if (error) {
      console.error("Error fetching videos:", error);
      return;
    }

    if (!data || data.length === 0) {
      const container = document.getElementById("video-container");
      if (container) {
        container.innerHTML = `<p style="padding:16px;">No videos found.</p>`;
      }
      return;
    }

    renderVideos(data);
  }

  // ------------------------------------------------------------
  // PAGE LOADERS
  // ------------------------------------------------------------
  function loadEdition() {
    const year = getQueryParam("edition");
    if (!year) return;

    fetchAndRender(s =>
      s.from("douzepoints")
        .select("*")
        .eq("Year", year)
        .order("Final_Rank", { ascending: true })
    );
  }

  function loadCountry() {
    const c = getQueryParam("country");
    if (!c) return;

    fetchAndRender(s =>
      s.from("douzepoints")
        .select("*")
        .ilike("Country", c)
        .order("Year", { ascending: false })
    );
  }

  function loadWinners() {
    fetchAndRender(s =>
      s.from("douzepoints")
        .select("*")
        .eq("Final_Rank", 1)
        .order("Year", { ascending: false })
    );
  }

  function loadFanFavorites() {
    fetchAndRender(s =>
      s.from("douzepoints")
        .select("*")
        .eq("FanFave", "Y")
        .order("Year", { ascending: false })
    );
  }

  async function loadHome() {
    if (!supabase) return;
    await ensureFavoritesLoaded();

    const car1 = document.getElementById("carouselTrack1");
    const car2 = document.getElementById("carouselTrack2");
    const car3 = document.getElementById("carouselTrack3");
    const car4 = document.getElementById("carouselTrack4");

    if (car1) {
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Final_Rank", 1)
        .order("Year", { ascending: false })
        .limit(40)
        .then(({ data, error }) => {
          if (!error) renderIntoCarousel("carouselTrack1", data || []);
        });
    }

    if (car2) {
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", 2024)
        .order("Final_Rank", { ascending: true })
        .then(({ data, error }) => {
          if (!error) renderIntoCarousel("carouselTrack2", data || []);
        });
    }

    if (car3) {
      supabase
        .from("douzepoints")
        .select("*")
        .eq("FanFave", "Y")
        .order("Year", { ascending: false })
        .then(({ data, error }) => {
          if (!error) renderIntoCarousel("carouselTrack3", data || []);
        });
    }

    if (car4) {
      supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", 2025)
        .order("Final_Rank", { ascending: true })
        .then(({ data, error }) => {
          if (!error) renderIntoCarousel("carouselTrack4", data || []);
        });
    }
  }

  // ------------------------------------------------------------
  // CAROUSEL SCROLLING
  // ------------------------------------------------------------
  function scrollCarousel(direction, trackId) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const container = track.parentElement;
    const card = track.querySelector(".carousel-video-item") || track.querySelector(".video-item");

    const cardWidth = card ? card.getBoundingClientRect().width + 30 : 260;
    const scrollAmount = direction * cardWidth * 4;

    container.scrollBy({
      left: scrollAmount,
      behavior: "smooth"
    });
  }

  // ------------------------------------------------------------
  // ROUTING
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname || "";

    // ⭐ Do nothing on favourites page; my-favorites.js controls it
    if (path.includes("my-favorites.html")) {
      return;
    } else if (path.includes("edition.html")) {
      loadEdition();
    } else if (path.includes("country.html")) {
      loadCountry();
    } else if (path.includes("winners.html")) {
      loadWinners();
    } else if (path.includes("fan-favorites.html")) {
      loadFanFavorites();
    } else if (path.includes("index.html") || path === "/") {
      loadHome();
    }
  });

  // ------------------------------------------------------------
  // EXPORTS
  // ------------------------------------------------------------
  window.renderVideos = renderVideos;
  window.scrollCarousel = scrollCarousel;
  window.ensureFavoritesLoaded = ensureFavoritesLoaded;
})();

