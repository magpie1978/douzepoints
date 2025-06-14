const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3NsJbFLtYWZSBn0WnfBYfO9CBqZfnMW4KIF9oT8DTzmvGX5SyQ03aaBeAMb0L_A0Cqdw81k679x5X/pub?output=csv';

// Convert Google Drive share link to embeddable link
function convertGoogleDriveLink(url) {
  if (!url) return '';
  const match = url.match(/\/d\/([^/]+)\//);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url; // fallback: return original if not matching
}

fetch(sheetUrl)
  .then(response => response.text())
  .then(csvText => {
    const rows = csvText.trim().split('\n').map(row => row.split(','));
    const headers = rows[0];

    // Map header names to index positions
    const yearIdx = headers.indexOf('Year');
    const countryIdx = headers.indexOf('Country');
    const artistIdx = headers.indexOf('Artist');
    const songIdx = headers.indexOf('Song');
    const videoIdx = headers.indexOf('Video_URL');

    const container = document.querySelector('.grid-container');

    rows.slice(1).forEach(row => {
      const year = row[yearIdx];
      const country = row[countryIdx];
      const artist = row[artistIdx];
      const song = row[songIdx];
      const rawVideoUrl = row[videoIdx];
      const video = convertGoogleDriveLink(rawVideoUrl);

      // Only process Albania entries
      if (country === 'Albania' && video) {
        const html = `
<!-- ${year} -->
<div class="video-item" data-artist="${artist}" data-country="${country}" data-song="${song}" data-year="${year}" onclick="GDriveOpenModalWithVideo('${video}')">
  <div class="preview-container">
    <img alt="${country} ${year}" src="images/${year}-AL.jpeg"/>
  </div>
  <div class="video-title-with-icon" onclick="event.stopPropagation()">
    <a href="albania.html">
      <img alt="Flag" class="icon-placeholder" src="flags/al.png"/>
    </a>
    <div class="video-title-text">
      <b>${artist}</b><br>${song}<br>${year}
    </div>
  </div>
</div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      }
    });
  })
  .catch(error => {
    console.error('Failed to load Albania entries:', error);
  });
