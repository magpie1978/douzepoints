/**
 * video.js — modal-only, robust trigger
 * - Uses inline URL vars (countryCode, imageUrl, flagUrl, path)
 * - Clicks (card, thumbnail, preview-container) trigger modal ONLY
 * - Tries multiple modal function signatures for compatibility
 * - No new-tab fallback
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

  // ---------- Rendering ----------
  function renderEntry(entry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'video-item';
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

    // Data attributes for sorting
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

    // --- Requested URL logic ---
    const countryCode = entry.Country_Code?.toLowerCase();
    const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
    const flagUrl = `/flags/${countryCode}.png`;
    const videoUrl = entry.Video_URL;
    const path = window.location.pathname;

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

    // Thumbnail (in case something else stops propagation)
    const thumb = wrapper.querySelector('.thumbnail');
    if (thumb) {
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', handleOpen);
    }

    // Preview container (extra safety)
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

  function renderVideos(entries) {
    const container = document.getElementById('video-container');
    if (!container) return;
    container.innerHTML = '';

    const frag = document.createDocumentFragment();
    (entries || []).forEach(entry => frag.appendChild(renderEntry(entry)));
    container.appendChild(frag);

    if (window.triggerInitialSort) window.triggerInitialSort();
  }

  // ---------- Data loading ----------
  async function fetchAndRender(queryFn, errorMsg, emptyMsg) {
    const supa = window.supabaseClient;
    const container = document.getElementById('video-container');

    if (!supa) {
      if (container) {
        container.innerHTML = `<p style="padding:16px">Supabase client not available. Initialize window.supabaseClient before loading video.js.</p>`;
      }
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

  // ---------- Country loader ----------
  function loadCountry() {
    const country = getQueryParam('country');
    const container = document.getElementById('video-container');

    if (!country) {
      if (container) {
        container.innerHTML = `<p style="padding:16px">No country specified. Add <code>?country=Sweden</code> (example) to the URL.</p>`;
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

  document.addEventListener('DOMContentLoaded', loadCountry);
  window.renderVideos = renderVideos;
})();
