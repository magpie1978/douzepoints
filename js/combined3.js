// === HELPERS ===
// Load the CSV using PapaParse and return a promise that resolves with parsed data
async function loadCSVData() {
  const csvUrl = "./data/DouzePoints.csv";
  const response = await fetch(csvUrl);
  const csvText = await response.text();

  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => v.trim(),
      complete: results => resolve(results.data)
    });
  });
}


// === UNIVERSAL VIDEO RENDERER ===
// Reusable function to load, filter, sort, and render video entries for main pages
async function loadAndRenderData({ filterFn, sortFn, defaultSort, fallbackMessage }) {
  const data = await loadCSVData();
  let filtered = filterFn(data);

  if (filtered.length === 0) {
    document.getElementById("video-container").innerHTML =
      `<p style='padding: 20px; color: #ccc;'>${fallbackMessage}</p>`;
    return;
  }

  if (sortFn) {
    filtered.sort(sortFn);
  }

  const container = document.getElementById("video-container");
  container.innerHTML = '';
  filtered.forEach(row => container.appendChild(buildVideoItem(row)));

  const sortSelect = document.getElementById("sort-options");
  if (sortSelect) {
    sortSelect.value = defaultSort;
    attachSorting();
    sortSelect.dispatchEvent(new Event("change"));
  }
}


// === DYNAMIC PAGE LOADER ===
// Detects which page is loaded and calls appropriate logic
document.addEventListener("DOMContentLoaded", () => {
  const pathname = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const editionParam = urlParams.get("edition");
  const countryParam = urlParams.get("country");

  if (pathname.endsWith("/") || pathname.includes("index.html")) {
    loadRecentWinnersToCarousel();
    loadEditionEntriesToCarousel();
    loadFanFavoritesToCarousel();
  } else if (pathname.includes("edition.html") && editionParam) {
    loadAndRenderData({
      filterFn: data => data.filter(row => row.Year === editionParam),
      sortFn: (a, b) => a.Country.localeCompare(b.Country),
      defaultSort: "country",
      fallbackMessage: `No entries found for edition: ${editionParam}`
    });
  } else if ((pathname.includes("country.html") || pathname.includes("winners.html")) && countryParam) {
    const isWinnersPage = pathname.includes("winners.html");
    loadAndRenderData({
      filterFn: data => {
        let result = data.filter(row => row.Country === countryParam);
        if (isWinnersPage) {
          result = result.filter(row => row.Final_Rank === "1");
        }
        return result;
      },
      sortFn: (a, b) => parseInt(b.Year) - parseInt(a.Year),
      defaultSort: "year-desc",
      fallbackMessage: `No data found for: ${countryParam}`
    });
  } else if (pathname.includes("fan-favorites.html")) {
    loadAndRenderData({
      filterFn: data => data.filter(row => row.FanFave?.trim().toUpperCase() === "Y"),
      sortFn: (a, b) => parseInt(b.Year) - parseInt(a.Year),
      defaultSort: "year-desc",
      fallbackMessage: "No fan favourites found."
    });
  } else if (pathname.includes("winners.html")) {
    loadAndRenderData({
      filterFn: data => data.filter(row => row.Final_Rank === "1"),
      sortFn: (a, b) => parseInt(b.Year) - parseInt(a.Year),
      defaultSort: "year-desc",
      fallbackMessage: "No winners found."
    });
  }
});


// === VIDEO ITEM BUILDER ===
// Builds the .video-item used in the main content (not carousel)
function buildVideoItem(row) {
  const countryCode = row.Country_Code?.toLowerCase();
  const div = document.createElement("div");
  div.className = "video-item";
  div.setAttribute("data-year", row.Year);
  div.setAttribute("data-artist", row.Artist);
  div.setAttribute("data-song", row.Song);
  div.setAttribute("data-country", row.Country);
  div.setAttribute("data-jury", row.Final_JuryPoints || "0");
  div.setAttribute("data-televote", row.Final_TelevotePoints || "0");
  div.setAttribute("data-total", row.Final_TotalPoints || "0");

  const semiFinalRank = row.SemiFinal_Rank?.trim() || '–';
  const finalRank = row.Final_Rank?.trim() || '';

  // True if the entry reached the final but has no SemiFinal_Rank
  const isBigFiveOrHost = finalRank && (row.SemiFinal_Rank === null || row.SemiFinal_Rank === undefined || row.SemiFinal_Rank.trim() === '');

  const finalBadgeHTML = isBigFiveOrHost
    ? `<img src="images/big.png" alt="Finalist" class="circle-icon">`
    : finalRank
      ? `<div class="rank-badge">${finalRank}</div>`
      : `<div class="rank-badge">–</div>`;

  div.innerHTML = `
    <div class="preview-container">
      <img src="images/${row.Year}-${countryCode.toUpperCase()}.jpeg" alt="${row.Artist}"/>
    </div>
    <div class="video-title-with-icon" onclick="event.stopPropagation()">
      <a href="country.html?country=${row.Country}">
        <img class="flag-icon" src="/flags/${countryCode}.png" alt="Flag">
      </a>
      <div class="video-title-text">
        <b>${row.Artist}</b><br>${row.Song}<br>${row.Year}
      </div>
      <div class="circle-group">
        <div class="circle-container">
          <div class="circle-label">SF</div>
          <div class="rank-badge">${semiFinalRank}</div>
        </div>
        <div class="circle-container">
          <div class="circle-label">F</div>
          ${finalBadgeHTML}
        </div>
      </div>
    </div>
  `;

  div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
  return div;
}




// === CAROUSEL ITEM BUILDER ===
function createVideoItem(row) {
  const countryCode = row.Country_Code?.toLowerCase();
  const div = document.createElement("div");
  div.className = "carousel-video-item";
  div.setAttribute("data-year", row.Year);
  div.setAttribute("data-artist", row.Artist);
  div.setAttribute("data-song", row.Song);
  div.setAttribute("data-country", row.Country);
  div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);

  div.innerHTML = `
    <div class="preview-container">
      <img src="images/${row.Year}-${countryCode?.toUpperCase()}.jpeg" alt="${row.Artist}"/>
    </div>
    <div class="video-title-with-icon" onclick="event.stopPropagation()">
      <a href="country.html?country=${row.Country}">
        <img class="flag-icon" src="flags/${countryCode}.png" alt="Flag">
      </a>
      <div class="video-title-text">
        <b>${row.Artist}</b><br>${row.Song}<br>${row.Year}
      </div>
    </div>
  `;
  return div;
}



// === CAROUSEL FUNCTIONS ===
function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const container = track.closest('.carousel-container');
  const itemWidth = track.querySelector('.carousel-video-item')?.offsetWidth + 20;
  const scrollAmount = itemWidth * 5;

  if (!track || !container || !itemWidth) return;

  container.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}


// === CAROUSEL DATA LOADERS ===
async function loadRecentWinnersToCarousel() {
  const data = await loadCSVData();
  const winners = data.filter(row => row.Final_Rank === "1")
                      .sort((a, b) => parseInt(b.Year) - parseInt(a.Year))
                      .slice(0, 10);

  const track = document.getElementById("carouselTrack1");
  if (!track) return;
  track.innerHTML = '';
  winners.forEach(row => track.appendChild(createVideoItem(row)));
}

async function loadEditionEntriesToCarousel() {
  const data = await loadCSVData();
  const entries = data.filter(row => row.Year === "2024");  // Static for now

  const track = document.getElementById("carouselTrack2");
  if (!track) return;
  track.innerHTML = '';
  entries.forEach(row => track.appendChild(createVideoItem(row)));
}

async function loadFanFavoritesToCarousel() {
  const data = await loadCSVData();
  const faves = data.filter(row => row.FanFave === "Y")
                    .sort((a, b) => parseInt(b.Year) - parseInt(a.Year))
                    .slice(0, 10);

  const track = document.getElementById("carouselTrack3");
  if (!track) return;
  track.innerHTML = '';
  faves.forEach(row => track.appendChild(createVideoItem(row)));
}
