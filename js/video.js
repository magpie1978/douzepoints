/**
 * video.js — modal-only trigger + home carousels + multi-page routing
 */

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
  function renderEntry(entry, variant) {
    const wrapper = document.createElement('div');
    wrapper.className = (variant === 'carousel') ? 'carousel-video-item' : 'video-item';
    wrapper.setAttribute('role', 'button');
    wrapper.tabIndex = 0;

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

    // Sorting data attributes (grid only)
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

    // Ranking visuals
    const rankDisplay   = dnq ? 'NQ' : totalRank;
    const pointsDisplay = dnq ? 'NQ' : totalPoints;
    const rankClass     = dnq ? 'score-circle dnq score-pos' : 'score-circle score-pos';
    const pointsClass   = dnq ? 'score-circle dnq score-pts' : 'score-circle score-pts';

    // ------------------------------------------------------------
    // NEW: Remove the score-wrapper on index.html only
    // ------------------------------------------------------------
    const isIndexPage =
      window.location.pathname.endsWith('/') ||
      window.location.pathname.endsWith('index.html');

    const scoreHTML = isIndexPage ? '' : `
      <div class="score-wrapper">
        <table class="score-table">
          <tr><th>Pos</th><th>Pts</th></tr>
          <tr>
            <td><div class="${rankClass}">${escapeHTML(String(rankDisplay))}</div></td>
            <td><div class="${pointsClass}">${escapeHTML(String(pointsDisplay))}</div></td>
          </tr>
        </table>
      </div>
    `;

    wrapper.innerHTML = `
      <div class="preview-container" data-video-url="${escapeHTML(videoUrl || '')}">
        <img class="thumbnail" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(entry.Artist || '')}" />
      </div>

      <div class="video-title-with-icon" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <a href="country.html?country=${encodeURIComponent(entry.Country || '')}" onclick="event.stopPropagation()">
            <img class="flag-icon" src="${escapeHTML(flagUrl)}" alt="Flag" />
          </a>
          <div class="video-title-text">${titleHTML}</div>
        </div>

        ${scoreHTML}
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

    return wrapper;
  }

  // ------------------------------------------------------------
  // RENDERING (GRID)
  // ------------------------------------------------------------
  function renderVideos(entries) {
    const container = document.getElementById('video-container');
    if (!container) return;
    container.innerHTML = '';

    const frag = document.createDocumentFragment();
    entries.forEach(entry => frag.appendChild(renderEntry(entry, 'grid')));
    container.appendChild(frag);

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
  }

  // ------------------------------------------------------------
  // FETCH WRAPPER
  // ------------------------------------------------------------
  async function fetchAndRender(queryFn, errorMsg, emptyMsg) {
    const supa = window.supabaseClient;
    const container = document.getElementById('video-container');

    if (!supa) {
      console.error('[video.js] Supabase missing.');
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

  // ------------------------------------------------------------
  // PAGE LOADERS
  // ------------------------------------------------------------

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
    const supa = window.supabaseClient;
    if (!supa) return;

    const track1 = document.getElementById('carouselTrack1'); 
    const track2 = document.getElementById('carouselTrack2');
    const track3 = document.getElementById('carouselTrack3');
    const track4 = document.getElementById('carouselTrack4');

    try {
      const tasks = [];

      if (track1) {
        tasks.push(
          supa.from('douzepoints')
            .select('*')
            .eq('Final_Rank', 1)
            .order('Year', { ascending: false })
            .limit(40)
            .then(({ data, error }) => {
              if (!error) renderIntoCarousel('carouselTrack1', data || []);
            })
        );
      }

      if (track4) {
        tasks.push(
          supa.from('douzepoints')
            .select('*')
            .eq('Year', 2025)
            .order('Final_Rank', { ascending: true })
            .then(({ data, error }) => {
              if (!error) renderIntoCarousel('carouselTrack4', data || []);
            })
        );
      }

      if (track2) {
        tasks.push(
          supa.from('douzepoints')
            .select('*')
            .eq('Year', 2024)
            .order('Final_Rank', { ascending: true })
            .then(({ data, error }) => {
              if (!error) renderIntoCarousel('carouselTrack2', data || []);
            })
        );
      }

      if (track3) {
        tasks.push(
          supa.from('douzepoints')
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

  window.renderVideos = renderVideos;

})();
