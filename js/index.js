
document.addEventListener("DOMContentLoaded", () => {
  loadRecentWinnersToCarousel();
  loadEditionEntriesToCarousel();
  loadFanFavoritesToCarousel();
});

function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const container = track.closest('.carousel-container');
  const itemWidth = track.querySelector('.carousel-video-item').offsetWidth + 20;
  const scrollAmount = itemWidth * 5;

  container.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}

function GDriveOpenModalWithVideo(videoUrl) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="document.body.removeChild(this.closest('.modal'))">&times;</span>
      <video id="modalVideo" 
             src="${videoUrl}" 
             controls 
             controlsList="nodownload" 
             oncontextmenu="return false"
             style="width: 81vw; height: 81vh;">
      </video>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('video').play().catch(console.warn);
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
      <img src="images/${row.Year}-${countryCode.toUpperCase()}.jpeg" alt="${row.Artist}"/>
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
