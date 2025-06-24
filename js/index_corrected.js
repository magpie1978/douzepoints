function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const container = track.closest('.carousel-container'); // Use container for scrolling
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20; // includes margin
  const scrollAmount = itemWidth * 5; // scroll 5 items

  container.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}



function openModalWithVideo(videoUrl) {
  // Create modal
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'flex';

  // Modal inner HTML
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="document.body.removeChild(this.closest('.modal'))">&times;</span>
      <video id="modalVideo" 
             src="${videoUrl}" 
             controls 
             controlsList="nodownload" 
             oncontextmenu="return false"
             style="width: 81vw; height: 81vh;"
             ></video>
    </div>
  `;

  // Add modal to page
  document.body.appendChild(modal);

  // Force video to play AFTER it is added
  const video = modal.querySelector('video');
  video.play().catch((e) => {
    console.warn('Video autoplay was blocked:', e);
  });
}



function OLDopenModalWithVideo(videoUrl) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="modal-content">
     <span class="close-button" onclick="document.body.removeChild(this.closest('.modal'))">&times;</span>
     <video 
     src="${videoUrl}" 
     controls 
     autoplay 
     controlsList="nodownload" 
     oncontextmenu="return false"
     ></video>
  </div>
  `
  ;

document.body.appendChild(modal);
}



function closeModal() {
 const modal = document.getElementById("videoModal");
 const container = document.getElementById("modalVideoContainer");
 modal.style.display = "none";
 container.innerHTML = "";
}

function showPreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  img.style.display = 'none';
  video.style.display = 'block';
  video.play();
}


function hidePreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  video.pause();
  video.style.display = 'none';
  img.style.display = 'block';
}

document.addEventListener("DOMContentLoaded", () => {
  loadRecentWinnersToCarousel();
  loadFanFavoritesToCarousel();
});

async function loadRecentWinnersToCarousel() {
  const csvUrl = "./data/DouzePoints.csv";
  const response = await fetch(csvUrl);
  const csvText = await response.text();

  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
    transform: v => v.trim(),
    complete: function(results) {
      let winners = results.data.filter(row => row.FinalResult === "1");
      winners.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
      winners = winners.slice(0, 10); // take most recent 10

      const track = document.getElementById("carouselTrack1");
      if (!track) return;

      track.innerHTML = ''; // clear existing static HTML

      winners.forEach(row => {
        const countryCode = row.Country_Code?.toLowerCase();
        const videoDiv = document.createElement("div");
        videoDiv.className = "video-item";
        videoDiv.setAttribute("data-artist", row.Artist);
        videoDiv.setAttribute("data-country", row.Country);
        videoDiv.setAttribute("data-song", row.Song);
        videoDiv.setAttribute("data-year", row.Year);
        videoDiv.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);

        videoDiv.innerHTML = `
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

        track.appendChild(videoDiv);
      });
    }
  });
}


async function loadFanFavoritesToCarousel() {
  const csvUrl = "./data/DouzePoints.csv";
  const response = await fetch(csvUrl);
  const csvText = await response.text();

  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
    transform: v => v.trim(),
    complete: function(results) {
      let data = results.data.filter(row => row.FanFave === "Y");
      data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year)); // Sort by most recent
      data = data.slice(0, 10); // Most recent 10 favorites

      const track = document.getElementById("carouselTrack3");
      if (!track) return;
      track.innerHTML = ''; // Clear any static entries

      data.forEach(row => {
        const countryCode = row.Country_Code?.toLowerCase();
        const videoDiv = document.createElement("div");
        videoDiv.className = "video-item";
        videoDiv.setAttribute("data-artist", row.Artist);
        videoDiv.setAttribute("data-country", row.Country);
        videoDiv.setAttribute("data-song", row.Song);
        videoDiv.setAttribute("data-year", row.Year);
        videoDiv.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);

        videoDiv.innerHTML = `
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

        track.appendChild(videoDiv);
      });
    }
  });
}

