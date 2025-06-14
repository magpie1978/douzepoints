const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3NsJbFLtYWZSBn0WnfBYfO9CBqZfnMW4KIF9oT8DTzmvGX5SyQ03aaBeAMb0L_A0Cqdw81k679x5X/pub?output=csv';

// Load PapaParse dynamically (only once)
const papaScript = document.createElement('script');
papaScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
document.head.appendChild(papaScript);

papaScript.onload = () => {
  fetch(sheetUrl)
    .then(response => response.text())
    .then(csvText => {
      const parsed = Papa.parse(csvText, { header: true });
      const rows = parsed.data;

      const container = document.querySelector('.grid-container');

      rows.forEach(row => {
        const year = row['Year'];
        const country = row['Country'];
        const artist = row['Artist'];
        const song = row['Song'];
        const rawVideoUrl = row['Video_URL'];

        // Ensure all values exist
        if (country === 'Albania' && rawVideoUrl) {
          const match = rawVideoUrl.match(/\/d\/([^/]+)\//);
          const embedUrl = match ? `https://drive.google.com/file/d/${match[1]}/preview` : rawVideoUrl;

          const html = `
<!-- ${year} -->
<div class="video-item" data-artist="${artist}" data-country="${country}" data-song="${song}" data-year="${year}" onclick="GDriveOpenModalWithVideo('${embedUrl}')">
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
};
