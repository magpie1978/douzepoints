/**
 * video.js
 * Renders country entries as cards and exposes renderVideos + triggerInitialSort globally.
 * The score-table circles are wired for dynamic updates by sorting.js.
 */

// Utility: safe text
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Utility: build flag and image URLs (adapt if your paths differ)
function getFlagUrl(countryCode) {
  // Expect ISO-2 or your existing code; adjust to your structure
  return `assets/flags/${(countryCode || '').toLowerCase()}.svg`;
}
function getImageUrl(entry) {
  // Adjust to your preview image structure if needed
  return entry.Image_URL || entry.Thumbnail || `assets/images/${escapeHTML(entry.Country || '')}.jpg`;
}

// Create a single video card
function renderEntry(entry) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-item';
  wrapper.setAttribute('role', 'button');
  wrapper.tabIndex = 0;

  // DATA-ATTRS for sorting + display updates
  const totalPoints   = Number(entry.Final_TotalPoints)   || 0;
  const juryPoints    = Number(entry.Final_JuryPoints)    || 0;
  const televotePoints= Number(entry.Final_TelevotePoints)|| 0;

  const totalRank     = Number(entry.Final_Rank)      || 0;
  const juryRank      = Number(entry.Final_JuryRank)  || 0;
  const televoteRank  = Number(entry.Final_TelevoteRank) || 0;

  // DNQ logic: if Final_Rank is 0/blank OR explicit flag says not qualified
  const dnq = (
    !entry.Final_Rank ||
    Number(entry.Final_Rank) === 0 ||
    String(entry.QualifiedFinal || '').toUpperCase() === 'N'
  );

  wrapper.dataset.total         = String(totalPoints);
  wrapper.dataset.jury          = String(juryPoints);
  wrapper.dataset.televote      = String(televotePoints);

  wrapper.dataset.totalrank     = String(totalRank);
  wrapper.dataset.juryrank      = String(juryRank);
  wrapper.dataset.televoterank  = String(televoteRank);

  wrapper.dataset.dnq           = dnq ? '1' : '0';

  // Keep other fields handy for sorting/searching if you need them
  if (entry.Year)    wrapper.dataset.year = String(entry.Year);
  if (entry.Artist)  wrapper.dataset.artist = entry.Artist.toLowerCase();
  if (entry.Song)    wrapper.dataset.song = entry.Song.toLowerCase();
  if (entry.Country) wrapper.dataset.country = entry.Country.toLowerCase();

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

  // Initial circles (default to TOTAL Pos/Pts unless DNQ)
  const rankDisplay   = dnq ? 'NQ' : (totalRank || '');
  const pointsDisplay = dnq ? 'NQ' : (totalPoints || '');

  const rankClass   = dnq ? 'score-circle dnq score-pos'  : 'score-circle score-pos';
  const pointsClass = dnq ? 'score-circle dnq score-pts'  : 'score-circle score-pts';

  wrapper.innerHTML = `
    <div class="preview-container" data-video-url="${escapeHTML(entry.Video_URL || entry.Video || '')}">
      <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(entry.Artist || '')}" />
      <!-- You can add a play overlay here if desired -->
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

  // Hook up click to open modal (expects modal.js to handle .openVideoModal)
  wrapper.addEventListener('click', (e) => {
    const videoUrl = wrapper.querySelector('.preview-container')?.getAttribute('data-video-url');
    if (!videoUrl) return;
    if (window.openVideoModal) {
      window.openVideoModal({ url: videoUrl, entry });
    }
  });

  // Keyboard accessibility
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      wrapper.click();
    }
  });

  return wrapper;
}

// Render list of entries into #video-container
function renderVideos(entries) {
  const container = document.getElementById('video-container');
  if (!container) return;
  container.innerHTML = '';

  const frag = document.createDocumentFragment();
  (entries || []).forEach(entry => {
    frag.appendChild(renderEntry(entry));
  });
  container.appendChild(frag);

  // After initial render, trigger an initial sort which also refreshes circles
  if (window.triggerInitialSort) {
    window.triggerInitialSort();
  }
}

// Expose globals used by country.html (if it calls these)
window.renderVideos = renderVideos;
