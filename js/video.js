/**
 * video.js — modal-only, robust trigger + homepage carousels
 * - Card click (and thumbnail click) opens modal ONLY
 * - Shared rendering for grid pages + home carousels
 * - Page routing based on window.location.pathname
 */

(function () {
  // ---------- Utilities ----------
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

  // Unified modal opener (no new tab fallback)
  function openModalStrict(videoUrl, entry) {
    if (!videoUrl) {
      console.error('[video.js] No Video_URL found on entry:', entry);
      return;
    }

    // Preferred modern signature
    if (typeof window.openVideoModal === 'function') {
      try {
        // Try object signature first
        window.openVideoModal({ url: videoUrl, entry });
        return;
      } catch (_) {
        // Try common alternates
        try { window.openVideoModal(videoUrl, entry); return; } catch (_) {}
        try { window.openVideoModal(videoUrl); return; } catch (_) {}
      }
    }

    // Legacy/global alternatives
    if (typeof window.showVideoModal === 'function') {
      try { window.showVideoModal(videoUrl, entry); return; } catch (_) {}
    }
    if (typeof window.openModal === 'function') {
      try { window.openModal(videoUrl, entry); return; } catch (_) {}
    }

    console.error('[video.js] No modal function found. Expected window.openVideoModal / showVideoModal / openModal.');
  }

  // ---------- Card rendering ----------
  function renderEntry(entry, variant) {
    const wrapper = document.createElement('div');
    wrapper.className = (variant === 'carousel') ? 'carousel-video-item' : 'video-item';
    wrapper.setAttribute('role', 'button');
    wrapper.tabIndex = 0;

    // Points/ranks (for sorting + score-circle display)
    const totalPoints    = Number(entry.Final_TotalPoints)     || 0;
    const juryPoints     = Number(entry.Final_JuryPoints)      || 0;
    const televotePoints = Number(entry.Final_TelevotePoints)  || 0;

    const totalRank      = Number(entry.Final_Rank)            || 0;
    const juryRank       = Number(entry.Final_JuryRank)        || 0;
    const televoteRank   = Number(entry.Final_TelevoteRank)    || 0;

    // DNQ logic
    const dnq = (
      !entry.Final_Rank ||
      Number(entry.Final_Rank) === 0 ||
      String(entry.QualifiedFinal || '').toUpperCase() === 'N'
    );

    // Data attributes for sorting (used on grid pages)
    wrapper.dataset.total        = String(totalPoints);
    wrapper.dataset.jury         = String(juryPoints);
    wrapper.dataset.televote     = String(televotePoints);
    wrapper.dataset.totalrank    = String(totalRank);
    wrapper.dataset.juryrank     = String(juryRank);
    wrapper.dataset.televoterank = String(televoteRank);
    wrapper.dataset.dnq          = dnq ? '1' : '0';

    if (entry.Year)    wrapper.dataset.year = String(entry.Year);
    if (entry.Artist)  wrapper.dataset.artist = String(entry.Artist).toLowerCase();
    if (entry.Song)    wrapper.dataset.song = String(entry.Song).toLowerCase();
    if (entry.Country) wrapper.dataset.country = String(entry.Country).toLowerCase();

    // --- Visuals / URLs ---
    const countryCode = entry.Country_Code?.toLowerCase();
    const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
    const flagUrl = `/flags/${countryCode}.png`;
    const videoUrl = entry.Video_URL;

    const titleHTML = `
      <div class="title-line">
        <div class="title-artist">${escapeHTML(entry.Artist || '')}</div>
        <div class="title-song">— ${escapeHTML(entry.Song || '')}</div>
      </div>
      <div class="title-meta">
        <span class="title-country">${escapeHTML(entry.Country || '')}</span>
        ${entry.Year ? `<span class="title-year">${escapeHTML(entry.Year)}</span>` : ''}
      </div>
    `;

    const rankDisplay   = dnq ? 'NQ' : (totalRank || '');
    const pointsDisplay = dnq ? 'NQ' : (totalPoints || '');
    const rankClass   = dnq ? 'score-circle dnq score-pos' : 'score-circle score-pos';
    const pointsClass = dnq ? 'score-circle dnq score-pts' : 'score-circle score-pts';

    wrapper.innerHTML = `
      <div class="preview-container" data-video-url="${escapeHTML(videoUrl || '')}">
        <img class="thumbnail" src="${escapeHTML(imageUrl || '')}" alt="${escapeHTML(entry.Artist || '')}" />
      </div>

      <div class="video-title-with-icon" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <a href="country.html?country=${encodeURIComponent(entry.Country || '')}" onclick="event.stopPropagation()">
            <img class="flag-icon" src="${escapeHTML(flagUrl || '')}" alt="Flag" />
          </a>
          <div class="video-title-text">
            ${titleHTML}
          </div>
        </div>

        <div class="score-wrapper">
          <table class="score-table">
            <tr><th>Pos</th><th>Pts</th></tr>
            <tr>
              <td><div class="${rankClass}">${escapeHTML(String(rankDisplay))}</div></td>
              <td><div class="${pointsClass}">${escapeHTML(String(pointsDisplay))}</div></td>
            </tr>
          </table>
        </div>
      </div>
    `;

    // --- Modal-only triggers ---
    const handleOpen = (e) => {
      if (e) e.preventDefault();
      e?.stopPropagation?.();
      openModalStrict(videoUrl, entry);
    };

    // Whole card
    wrapper.addEventListener('click', handleOpen);

    // Thumbnail
    const thumb = wrapper.querySelector('.thumbnail');
    if (thumb) {
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', handleOpen);
    }

    // Preview container
    const preview = wrapper.querySelector('.preview-container');
    if (preview) {
      preview.addEventListener('click', handleOpen);
    }

    // Keyboard accessibility
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen(e);
      }
    });

    return wrapper;
  }

  // Grid pages (country / edition / winners / fan favourites)
  function renderVideos(entries) {
    const container = document.getElementById('video-container');
    if (!container) return;
    container.innerHTML = '';

    const frag = document.createDocumentFragment();
    (entries || []).forEach(entry => frag.appendChild(renderEntry(entry, 'grid')));
    container.appendChild(frag);

    if (window.triggerInitialSort) window.triggerInitialSort();
  }

  // Home-page carousels
  function renderIntoCarousel(trackId, entries) {
    const track = document.getElementById(trackId);
    if (!track) return;

    track.innerHTML = '';
    const frag = document.createDocumentFragment();
    (entries || []).forEach(entry => frag.appendChild(renderEntry(entry, 'carousel')));
    track.appendChild(frag);
  }

  // ---------- Data loading helper ----------
  async function fetchAndRender(queryFn, errorMsg, emptyMsg) {
    const supa = window.supabaseClient;
    const container = document.getElementById('video-container');

    if (!supa) {
      if (container) {
        container.innerHTML = `<p style="padding:16px">Supabase client not available. Initialize window.supabaseClient before loading video.js.</p>`;
      }
      console.error('[video.js] Supabase client missing.');
      return;
    }

    const { data, error } = await queryFn(supa);
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

  // ---------- Country page loader ----------
  function loadCountry() {
    const country = getQueryParam('country');
    const container = document.getElementById('video-container');

    if (!country) {
      if (container) {
        container.innerHTML = `<p style="padding:16px">
          No country specified. Add <code>?country=Sweden</code> (example) to the URL.
        </p>`;
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
      `No entries found for country: ${country}`
    );
  }

  // ---------- Edition page loader ----------
  function loadEdition() {
    const edition = getQueryParam('edition');
    const container = document.getElementById('video-container');

    if (!edition) {
      if (container) {
        container.innerHTML = `<p style="padding:16px">
          No edition specified. Add <code>?edition=2024</code> (example) to the URL.
        </p>`;
      }
      return;
    }

    return fetchAndRender(
      (supa) => supa
        .from('douzepoints')
        .select('*')
        .eq('Year', edition)
        .order('Final_Rank', { ascending: true }),
      `Error loading edition ${edition}`,
      `No entries found for edition: ${edition}`
    );
  }

  // ---------- Winners page loader ----------
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

  // ---------- Fan Favourites page loader ----------
  function loadFanFavorites() {
    // Adjust 'Fan_Favourite'/'Y' if your schema uses a different flag
    return fetchAndRender(
      (supa) => supa
        .from('douzepoints')
        .select('*')
        .eq('Fan_Favourite', 'Y')
        .order('Year', { ascending: false }),
      'Error loading fan favourites',
      'No fan favourites found.'
    );
  }

  // ---------- Home page (index.html) carousels ----------
  async function loadHome() {
    const supa = window.supabaseClient;
    if (!supa) {
      console.error('[video.js] Supabase client missing; cannot load home carousels.');
      return;
    }

    const track1 = document.getElementById('carouselTrack1'); // Eurovision Winners
    const track2 = document.getElementById('carouselTrack2'); // Malmö 2024
    const track3 = document.getElementById('carouselTrack3'); // Fan Favourites
    const track4 = document.getElementById('carouselTrack4'); // Basel 2025

    try {
      const promises = [];

      // Winners (all years where Final_Rank = 1)
      if (track1) {
        promises.push(
          supa.from('douzepoints')
            .select('*')
            .eq('Final_Rank', 1)
            .order('Year', { ascending: false })
            .limit(40)
            .then(({ data, error }) => {
              if (error) {
                console.error('Error loading winners carousel:', error);
                return;
              }
              renderIntoCarousel('carouselTrack1', data || []);
            })
        );
      }

      // Basel 2025
      if (track4) {
        promises.push(
          supa.from('douzepoints')
            .select('*')
            .eq('Year', 2025)
            .order('Final_Rank', { ascending: true })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error loading Basel 2025 carousel:', error);
                return;
              }
              renderIntoCarousel('carouselTrack4', data || []);
            })
        );
      }

      // Malmö 2024
      if (track2) {
        promises.push(
          supa.from('douzepoints')
            .select('*')
            .eq('Year', 2024)
            .order('Final_Rank', { ascending: true })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error loading Malmö 2024 carousel:', error);
                return;
              }
              renderIntoCarousel('carouselTrack2', data || []);
            })
        );
      }

      // Fan Favourites
      if (track3) {
        promises.push(
          supa.from('douzepoints')
            .select('*')
            .eq('Fan_Favourite', 'Y') // tweak if needed
            .order('Year', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error loading Fan Favourites carousel:', error);
                return;
              }
              renderIntoCarousel('carouselTrack3', data || []);
            })
        );
      }

      await Promise.all(promises);
    } catch (err) {
      console.error('Unexpected error loading home carousels:', err);
    }
  }

  // ---------- Carousel scrolling helper (used by index.html) ----------
  window.scrollCarousel = function (direction, trackId) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const container = track.parentElement; // .carousel-container
    if (!container || !container.scrollBy) return;

    const card = track.querySelector('.carousel-video-item') || track.querySelector('.video-item');
    const cardWidth = card ? card.getBoundingClientRect().width + 30 : 250; // fallback

    container.scrollBy({
      left: direction * cardWidth * 4, // roughly 4 cards per "page"
      behavior: 'smooth'
    });
  };

  // ---------- Page routing ----------
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname || '';

    if (path === '/' || path.endsWith('/index.html') || path.includes('index.html')) {
      // Home page with carousels
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
    // Other pages can manually call window.renderVideos(entries) if needed
  });

  // Expose manual renderer so other pages can inject their own data if desired
  window.renderVideos = renderVideos;
})();
