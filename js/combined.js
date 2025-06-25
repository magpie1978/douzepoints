// extract query parameters from the current URL
// from either country.html or edition.html
// needed so the script knows what data to load and display
const urlParams = new URLSearchParams(window.location.search);
const editionParam = urlParams.get("edition");
const countryParam = urlParams.get("country");

// once the page finishes loading:
    // If on edition.html and editionParam is set, it calls loadEditionData().
    // If on country.html or winners.html and countryParam is set, it calls loadCountryData().
    // If on fan-favorites.html it calls loadFavoriteEntries().
document.addEventListener("DOMContentLoaded", () => {
  const pathname = window.location.pathname;

  if (pathname.endsWith("/") || pathname.includes("index.html")) {
    loadRecentWinnersToCarousel();
    loadEditionEntriesToCarousel();
    loadFanFavoritesToCarousel();
  } else if (pathname.includes("edition.html") && editionParam) {
    loadEditionData();
  } else if (pathname.includes("country.html") && countryParam) {
    loadCountryData();
  } else if (pathname.includes("winners.html")) {
    loadWinnersData();
  } else if (pathname.includes("fan-favorites.html")) {
    loadFavouriteEntries();
  }
});

// EDITION LOGIC
// Loads and displays all entries for a specific Eurovision year.
async function loadEditionData() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);  // fetch DouzePoints.csv
    const csvText = await response.text();

    // parse it into rows using PapaParse
    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            
            // filter the data by row.Year === editionParam
            const data = results.data.filter(row => row.Year === editionParam);
            
            // if no data found, log a warning and return
            if (data.length === 0) {
                console.warn("No entries found for edition:", editionParam);
                return;
            }

            // clear the #video-container and inject .video-item elements for each entry
            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                container.appendChild(buildVideoItem(row));
            });

            // attach the sorting logic and default sort to "country"
            attachSorting();
            const select = document.getElementById("sort-options");
            if (select) {
                select.value = "country";
                select.dispatchEvent(new Event("change"));
            }
        }
    });
}

// COUNTRY OR WINNERS LOGIC
// Loads and displays all entries for a specific country (or only winners if on winners.html)
async function loadCountryData() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);  // Fetch DouzePoints.csv
    const csvText = await response.text();

    // parse it into rows using PapaParse
    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            const isWinnersPage = window.location.pathname.includes("winners.html");

            // filter the data by row.Country === countryParam
            let data = results.data.filter(row => row.Country === countryParam);

            // if winnersPage then filter the data by row.FinalResult === 1
            if (isWinnersPage) {
                data = data.filter(row => row.FinalResult === "1");
            }

            // if no data found, log a warning and return
            if (data.length === 0) {
                console.warn("No data found for:", countryParam);
                return;
            }

            // Sort data by year (descending)
            data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

            // clear #video-container and inject video items
            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                container.appendChild(buildVideoItem(row));
            });

            // attach sorting logic and set the default to "year-desc"
            const sortSelect = document.getElementById("sort-options");
            if (sortSelect) {
                sortSelect.value = "year-desc";
                attachSorting();
                sortSelect.dispatchEvent(new Event("change"));
            }
        }
    });
}


// FAN FAVORITES LOGIC
// Loads and displays all entries for fan favorites
async function loadFavouriteEntries() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            let data = results.data.filter(row =>
                row.FanFave && row.FanFave.trim().toUpperCase() === "Y"
            );

            if (data.length === 0) {
                document.getElementById("video-container").innerHTML =
                    "<p style='padding: 20px; color: #ccc;'>No fan favourites found.</p>";
                return;
            }

            data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                container.appendChild(buildVideoItem(row));
            });

            const sortSelect = document.getElementById("sort-options");
            if (sortSelect) {
                sortSelect.value = "year-desc";
                attachSorting();
                sortSelect.dispatchEvent(new Event("change"));
            }
        }
    });
}


// WINNERS LOGIC
// Loads and displays all entries for a specific country (or only winners if on winners.html)
async function loadWinnersData() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            let data = results.data.filter(row => row.FinalResult === "1");

            if (data.length === 0) {
                document.getElementById("video-container").innerHTML =
                    "<p style='padding: 20px; color: #ccc;'>No winners found.</p>";
                return;
            }

            data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                container.appendChild(buildVideoItem(row));
            });

            const sortSelect = document.getElementById("sort-options");
            if (sortSelect) {
                sortSelect.value = "year-desc";
                attachSorting();
                sortSelect.dispatchEvent(new Event("change"));
            }
        }
    });
}


// SHARED FUNCTION
// builds a .video-item DOM element for a given row of data
function buildVideoItem(row) {
    const countryCode = row.Country_Code?.toLowerCase();
    const div = document.createElement("div");
    div.className = "video-item";
    div.setAttribute("data-year", row.Year);
    div.setAttribute("data-artist", row.Artist);
    div.setAttribute("data-song", row.Song);
    div.setAttribute("data-country", row.Country);

    div.innerHTML = `
        <div class="preview-container">
            <img src="images/${row.Year}-${countryCode.toUpperCase()}.jpeg" alt="${row.Artist}"/>
        </div>
        <div class="video-title-with-icon" onclick="event.stopPropagation()">
            <a href="country.html?country=${row.Country}">
                <img class="flag-icon" src="/flags/${countryCode}.png" alt="Flag">
            </a>
            <div class="video-title-text">
                <b>${row.Artist}</b><br>${row.Song}<br>${row.Year || row.Country}
            </div>
        </div>
    `;
    div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
    return div;
}


// CAROUSEL FUNCTIONS
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
      complete: function(results) {
        resolve(results.data);
      }
    });
  });
}

async function loadRecentWinnersToCarousel() {
  const data = await loadCSVData();
  const winners = data.filter(row => row.FinalResult === "1")
                      .sort((a, b) => parseInt(b.Year) - parseInt(a.Year))
                      .slice(0, 10);

  const track = document.getElementById("carouselTrack1");
  if (!track) return;
  track.innerHTML = '';
  winners.forEach(row => track.appendChild(createVideoItem(row)));
}

async function loadEditionEntriesToCarousel() {
  const data = await loadCSVData();
  const entries = data.filter(row => row.Year === "2024");

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
