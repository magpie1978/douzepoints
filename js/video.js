import { supabase } from './supabaseClient.js';

// --- Shared Helpers ---
const container = document.getElementById('video-container');

// Read <select> value and normalize to 'final' | 'jury'
function getScoreMode() {
  const sel = document.querySelector('#score-mode, select[data-score-mode]');
  const val = sel?.value?.trim().toLowerCase() || '';
  return val === 'jury points' ? 'jury' : 'final';
}

// Is this entry a DNQ (didn't qualify for the Final)?
function isDNQFromDataset(card) {
  const finalRank = (card.dataset.finalRank || '').toString();
  const qualified = (card.dataset.qualifiedFinal || '').toUpperCase();
  return !finalRank || finalRank === '0' || qualified === 'N';
}

// Update the two score circles on a rendered card
function updateCardCircles(card, mode) {
  const dnq = isDNQFromDataset(card);
  const chosenRank   = mode === 'jury' ? card.dataset.juryRank   : card.dataset.finalRank;
  const chosenPoints = mode === 'jury' ? card.dataset.juryPoints : card.dataset.finalPoints;

  const rankDisplay   = dnq ? 'DNQ' : (chosenRank || 0);
  const pointsDisplay = dnq ? 'DNQ' : (chosenPoints || 0);

  const circles = card.querySelectorAll('.score-circle');
  if (circles[0]) {
    circles[0].textContent = rankDisplay;
    circles[0].classList.toggle('dnq', dnq);
  }
  if (circles[1]) {
    circles[1].textContent = pointsDisplay;
    circles[1].classList.toggle('dnq', dnq);
  }
}

// Resort cards by chosen score (Final/Jury). DNQs sink to bottom.
function sortCardsByScore() {
  if (!container) return;
  const mode = getScoreMode();
  const cards = Array.from(container.querySelectorAll('.video-item'));

  cards.sort((a, b) => {
    const aDNQ = isDNQFromDataset(a);
    const bDNQ = isDNQFromDataset(b);
    if (aDNQ !== bDNQ) return aDNQ ? 1 : -1; // DNQs last

    const aPts = Number(mode === 'jury' ? a.dataset.juryPoints  : a.dataset.finalPoints) || 0;
    const bPts = Number(mode === 'jury' ? b.dataset.juryPoints  : b.dataset.finalPoints) || 0;
    if (bPts !== aPts) return bPts - aPts; // higher points first

    const aRank = Number(mode === 'jury' ? a.dataset.juryRank : a.dataset.finalRank) || 9e9;
    const bRank = Number(mode === 'jury' ? b.dataset.juryRank : b.dataset.finalRank) || 9e9;
    return aRank - bRank; // lower rank wins as tie-break
  });

  cards.forEach(card => container.appendChild(card));
}

// Make initial sort callable from fetchAndRender
window.triggerInitialSort = sortCardsByScore;

// --- Card Renderer ---
function renderEntry(entry) {
  const countryCode = entry.Country_Code?.toLowerCase();
  const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
  const flagUrl = `/flags/${countryCode}.png`;
  const path = window.location.pathname;

  const div = document.createElement('div');
  div.className = 'video-item';
  div.setAttribute('data-year', entry.Year);
  div.setAttribute('data-artist', entry.Artist);
  div.setAttribute('data-song', entry.Song);
  div.setAttribute('data-country', entry.Country);

  // Store values for later re-render/sort without refetch
  div.dataset.finalRank       = entry.Final_Rank ?? '';
  div.dataset.finalPoints     = entry.Final_TotalPoints ?? '';
  div.dataset.juryRank        = entry.Final_JuryRank ?? '';
  div.dataset.juryPoints      = entry.Final_JuryPoints ?? '';
  div.dataset.qualifiedFinal  = (entry.QualifiedFinal ?? '').toString();

  const titleHTML = path.includes('edition.html')
    ? `<b>${entry.Song}</b><br>${entry.Artist}<br>${entry.Country}`
    : `<b>${entry.Artist}</b><br>${entry.Song}<br>${entry.Year}`;

  // Mode for initial paint
  const mode = getScoreMode();

  // DNQ if no final rank, rank = 0, or explicit flag
  const didNotQualify = !entry.Final_Rank || entry.Final_Rank === 0 || (entry.QualifiedFinal && entry.QualifiedFinal === 'N');

  // Choose fields based on mode
  const chosenRank   = mode === 'jury' ? entry.Final_JuryRank   : entry.Final_Rank;
  const chosenPoints = mode === 'jury' ? entry.Final_JuryPoints : entry.Final_TotalPoints;

  // Display text (DNQ overrides)
  const rankDisplay   = didNotQualify ? 'DNQ' : (chosenRank ?? 0);
  const pointsDisplay = didNotQualify ? 'DNQ' : (chosenPoints ?? 0);

  // Add DNQ class if needed
  const rankClass   = `score-circle${didNotQualify ? ' dnq' : ''}`;
  const pointsClass = `score-circle${didNotQualify ? ' dnq' : ''}`;

  div.innerHTML = `
    <div class="preview-container">
      <img src="${imageUrl}" alt="${entry.Artist}" />
    </div>
    <div class="video-title-with-icon" onclick="event.stopPropagation()" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:10px;">
        <a href="country.html?country=${entry.Country}">
          <img class="flag-icon" src="${flagUrl}" alt="Flag">
        </a>
        <div class="video-title-text">${titleHTML}</div>
      </div>
      <div class="score-wrapper">
        <table class="score-table">
          <tr><th>Pos</th><th>Pts</th></tr>
          <tr>
            <td><div class="${rankClass}">${rankDisplay}</div></td>
            <td><div class="${pointsClass}">${pointsDisplay}</div></td>
          </tr>
        </table>
      </div>
    </div>
  `;

  div.onclick = () => GDriveOpenModalWithVideo(entry.Video_URL);
  return div;
}

// --- Fetch + Render (used by winners, edition, country, fan faves) ---
async function fetchAndRender(queryFn, errorMsg, emptyMsg) {
  const { data, error } = await queryFn();
  if (error) {
    if (container) container.innerHTML = `<p style='padding: 20px;'>${errorMsg}: ${error.message}</p>`;
    return;
  }
  if (!data?.length) {
    if (container) container.innerHTML = `<p style='padding: 20px;'>${emptyMsg}</p>`;
    return;
  }

  if (container) {
    container.innerHTML = '';
    data.forEach(entry => container.appendChild(renderEntry(entry)));
  }

  // Initial sort based on the current dropdown value
  if (typeof window.triggerInitialSort === 'function') {
    window.triggerInitialSort();
  }
}

// --- Page Loaders ---
function loadWinners() {
  return fetchAndRender(
    () => supabase.from('douzepoints').select('*').eq('Final_Rank', '1').order('Year', { ascending: false }),
    "Error loading winners",
    "No winners found."
  );
}

function loadFanFaves() {
  return fetchAndRender(
    () => supabase.from('douzepoints').select('*').eq('FanFave', 'Y').order('Year', { ascending: false }),
    "Error loading fan favourites",
    "No fan favourites found."
  );
}

function loadEdition() {
  const edition = new URLSearchParams(window.location.search).get("edition");
  const titleEl = document.getElementById('edition-title');
  if (titleEl && edition) titleEl.textContent = `Eurovision ${edition}`;

  if (!edition) {
    if (container) container.innerHTML = `<p style='padding: 20px;'>No edition specified.</p>`;
    return;
  }
  return fetchAndRender(
    () => supabase.from('douzepoints').select('*').eq('Year', edition).order('Country', { ascending: true }),
    `Error loading edition ${edition}`,
    `No entries found for edition: ${edition}`
  );
}

function loadCountry() {
  const country = new URLSearchParams(window.location.search).get("country");
  if (!country) {
    if (container) container.innerHTML = `<p style='padding: 20px;'>No country specified.</p>`;
    return;
  }
  return fetchAndRender(
    () => supabase.from('douzepoints').select('*').ilike('Country', country).order('Year', { ascending: false }),
    `Error loading ${country}`,
    `No entries found for country: ${country}`
  );
}

// --- Carousels (index only) ---
function createVideoItem(entry) {
  const countryCode = entry.Country_Code?.toLowerCase();
  const div = document.createElement('div');
  div.className = "carousel-video-item";
  div.onclick = () => GDriveOpenModalWithVideo(entry.Video_URL);

  div.innerHTML = `
    <div class="preview-container">
      <img src="images/${entry.Year}-${countryCode?.toUpperCase()}.jpeg" alt="${entry.Artist}" />
    </div>
    <div class="video-title-with-icon" onclick="event.stopPropagation()">
      <a href="country.html?country=${entry.Country}">
        <img class="flag-icon" src="flags/${countryCode}.png" alt="Flag">
      </a>
      <div class="video-title-text">
        <b>${entry.Artist}</b><br>${entry.Song}<br>${entry.Year}
      </div>
    </div>`;
  return div;
}

async function loadCarouselData(trackId, filterFn, sortFn, limit) {
  const { data, error } = await supabase.from("douzepoints").select("*");
  if (error || !data) return;

  const entries = data.filter(filterFn).sort(sortFn).slice(0, limit);
  const track = document.getElementById(trackId);
  if (track) {
    track.innerHTML = "";
    entries.forEach(row => track.appendChild(createVideoItem(row)));
  }
}

function loadIndexCarousels() {
  loadCarouselData("carouselTrack1", row => row.Final_Rank === "1", (a, b) => b.Year - a.Year, 10);
  loadCarouselData("carouselTrack2", row => row.Year === 2024, () => 0, 20);
  loadCarouselData("carouselTrack3", row => (row.FanFave || '').trim().toUpperCase() === 'Y', (a, b) => b.Year - a.Year, 10);
  loadCarouselData("carouselTrack4", row => row.Year === 2025, () => 0, 20);
}

// --- Route Dispatcher + Dropdown wiring ---
document.addEventListener("DOMContentLoaded", () => {
  // Dropdown live-update: repaint circles + sort
  const modeSel = document.querySelector('#score-mode, select[data-score-mode]');
  if (modeSel) {
    modeSel.addEventListener('change', () => {
      const mode = getScoreMode();
      document.querySelectorAll('.video-item').forEach(card => updateCardCircles(card, mode));
      sortCardsByScore();
    });
  }

  const path = window.location.pathname;
  const routes = {
    'winners.html': loadWinners,
    'fan-favorites.html': loadFanFaves,
    'edition.html': loadEdition,
    'country.html': loadCountry,
    'index.html': loadIndexCarousels
  };

  let matched = false;
  for (const page in routes) {
    if (path.includes(page)) {
      routes[page]();
      matched = true;
      break;
    }
  }

  // Root path => index carousels
  if (!matched && (path === '/' || path === '')) {
    loadIndexCarousels();
  }
});
