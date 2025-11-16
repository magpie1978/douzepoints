const supabase = window.supabaseClient || null;
const isFavoritesPage = window.location.pathname.includes("my-favorites.html");

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
          variant === "carousel" || isFavoritesPage
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

