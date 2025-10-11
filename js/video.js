/**
 * video.js
 * Renders entries into #video-container and wires score circles for sorting.js
 * Works with Supabase if available, but won't crash if it's not yet initialized.
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

  function getFlagUrl(countryCode) {
    return `assets/flags/${(countryCode || '').toLowerCase()}.svg`;
  }

  function getImageUrl(entry) {
    return entry.Image_URL || entry.Thumbnail || `assets/images/${escapeHTML(entry.Country || 'default')}.jpg`;
  }

  // Try to obtain/create a Supabase client without hard failing if not present
  function getSupabaseClient() {
    if (window.supabaseClient?.from) return window.supabaseClient;
    if (window.supabase?.createClient && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      return window.supabaseClient;
    }
    return null; // gracefully handled later
  }

  // ---------- Rendering ----------
  function renderEntry(entry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'video-item';
    wrapper.setAttribute('role', 'button');
    wrapper.tabIndex = 0;

    // Points/ranks
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

    // Data attributes for sorting & display
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

    const imageUrl = getImageUrl(entry);
    const flagUrl  = getFlagUrl(entry.Country_Code || entry.CountryCode || '');

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
      <div class="preview-container" data-video-url="${escapeHTML(entry.Video_URL || entry.Video || '')}">
        <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(entry.Artist || '')}" />
      </div>

      <div class="video-title-with-icon" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <a href="country.html?country=${encodeURIComponent(entry.Country || '')}" onclick="event.stopPropagation()">
            <img class="flag-icon" src="${escapeHTML(flagUrl)}" alt="Flag" />
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

    // Click to open modal
    wrapper.addEventListener('click', () => {
      const videoUrl = wrapper.querySelector('.preview-container')?.getAttribute('data-video-url');
      if (!videoUrl) return;
      if (window.openVideoModal) {
        window.openVideoModal({ url: videoUrl, entry });
      }
    });

    // Keyboard
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        wrapper.click();
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

  // ---------- Data loading (Supabase) ----------
  async function fetchAndRender(queryFn, errorMsg, emptyMsg) {
    const supa = getSupabaseClient();
    const container = document.getElementById('video-container');

    if (!supa) {
      if (container) {
        container.innerHTML = `<p style="padding:16px">Supabase client not available. Please initialize it (window.supabaseClient) or set SUPABASE_URL / SUPABASE_ANON_KEY.</p>`;
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

  // Country page loader: expects ?country=CountryName
  function loadCountry() {
    const country = getQueryParam('country');
    if (!country) {
      // If no param, you can fallback to showing latest entries or winners; here we just show a hint.
      const container = document.getElementById('video-container');
      if (container) {
        container.innerHTML = `<p style="padding:16px">No country specified. Add <code>?country=Sweden</code> (example) to the URL.</p>`;
      }
      return;
    }

    return fetchAndRender(
      (supa) => supa
        .from('douzepoints')
        .select('*')
        .ilike('Country', country)               // case-insensitive match; adjust to eq() if you store canonical names
        .order('Year', { ascending: false }),
      `Error loading ${country}`,
      `No entries found for country: ${country}`
    );
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', loadCountry);

  // Expose for other scripts (optional)
  window.renderVideos = renderVideos;
})();
