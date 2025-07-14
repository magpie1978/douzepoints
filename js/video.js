import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Setup ---
const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

// --- Shared Helpers ---
const container = document.getElementById('video-container');

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
  div.setAttribute('data-jury', entry.Final_JuryPoints || "0");
  div.setAttribute('data-televote', entry.Final_TelevotePoints || "0");
  div.setAttribute('data-total', entry.Final_TotalPoints || "0");

  const titleHTML = path.includes('edition.html')
    ? `<b>${entry.Song}</b><br>${entry.Artist}<br>${entry.Country}`
    : `<b>${entry.Artist}</b><br>${entry.Song}<br>${entry.Year}`;

  div.innerHTML = `
    <div class="preview-container">
      <img src="${imageUrl}" alt="${entry.Artist}" />
    </div>
    <div class="video-title-with-icon" onclick="event.stopPropagation()">
      <a href="country.html?country=${entry.Country}">
        <img class="flag-icon" src="${flagUrl}" alt="Flag">
      </a>
      <div class="video-title-text">
        ${titleHTML}
      </div>
    </div>
  `;

  div.onclick = () => GDriveOpenModalWithVideo(entry.Video_URL);
  return div;
}

async function fetchAndRender(queryFn, errorMsg, emptyMsg) {
  const { data, error } = await queryFn();
  if (error) {
    container.innerHTML = `<p style='padding: 20px;'>${errorMsg}: ${error.message}</p>`;
    return;
  }
  if (!data?.length) {
    container.innerHTML = `<p style='padding: 20px;'>${emptyMsg}</p>`;
    return;
  }

  container.innerHTML = '';
  data.forEach(entry => container.appendChild(renderEntry(entry)));
  document.getElementById("sort-options")?.dispatchEvent(new Event("change"));
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
  if (!edition) {
    container.innerHTML = `<p style='padding: 20px;'>No edition specified.</p>`;
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
    container.innerHTML = `<p style='padding: 20px;'>No country specified.</p>`;
    return;
  }
  return fetchAndRender(
    () => supabase.from('douzepoints').select('*').ilike('Country', country).order('Year', { ascending: false }),
    `Error loading ${country}`,
    `No entries found for country: ${country}`
  );
}

// --- Carousel-Specific ---
function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const container = track?.closest('.carousel-container');
  const itemWidth = track?.querySelector('.carousel-video-item')?.offsetWidth + 20;
  const scrollAmount = itemWidth * 5;
  if (track && container) {
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  }
}
window.scrollCarousel = scrollCarousel;

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
}

// --- Route Dispatcher ---
document.addEventListener("DOMContentLoaded", () => {
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

  // Run index carousel loader if on root path (e.g. /)
  if (!matched && (path === '/' || path === '')) {
    loadIndexCarousels();
  }
});
