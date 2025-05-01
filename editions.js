/*  LOGIN SCRIPT */
/* if (sessionStorage.getItem("loggedIn") !== "true") { */
/*   window.location.href = "login.html"; */
/* } */


function openModalWithVideo(videoUrl) {
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
  `;

  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById("videoModal");
  modal.style.display = "none";
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

/* lucide icon script */
lucide.createIcons();


/* SORTING SCRIPT */
document.addEventListener("DOMContentLoaded", function () {
  const sortSelect = document.getElementById('sort-options');
  const grid = document.querySelector('.grid-container');

  function getAttr(el, attr) {
    return el.getAttribute(attr)?.toLowerCase() || "";
  }

  function getNumber(el, attr) {
    return parseInt(el.getAttribute(attr)) || 0;
  }

  function sortItems(value) {
    const items = Array.from(grid.querySelectorAll('.video-item'));

    items.sort((a, b) => {
      switch (value) {
        case 'country':
          return getAttr(a, 'data-country').localeCompare(getAttr(b, 'data-country'));
        case 'country-desc':
          return getAttr(b, 'data-country').localeCompare(getAttr(a, 'data-country'));
        case 'artist':
          return getAttr(a, 'data-artist').localeCompare(getAttr(b, 'data-artist'));
        case 'song':
          return getAttr(a, 'data-song').localeCompare(getAttr(b, 'data-song'));
        case 'final-total':
          return getNumber(b, 'data-final-total-points') - getNumber(a, 'data-final-total-points');
        case 'final-total-asc':
          return getNumber(a, 'data-final-total-points') - getNumber(b, 'data-final-total-points');
        case 'final-jury':
          return getNumber(b, 'data-final-jury-points') - getNumber(a, 'data-final-jury-points');
        case 'final-jury-asc':
          return getNumber(a, 'data-final-jury-points') - getNumber(b, 'data-final-jury-points');
        case 'final-televote':
          return getNumber(b, 'data-final-televote-points') - getNumber(a, 'data-final-televote-points');
        case 'final-televote-asc':
          return getNumber(a, 'data-final-televote-points') - getNumber(b, 'data-final-televote-points');
        case 'semifinal-total':
          return getNumber(b, 'data-semifinal-total-points') - getNumber(a, 'data-semifinal-total-points');
        case 'semifinal-total-asc':
          return getNumber(a, 'data-semifinal-total-points') - getNumber(b, 'data-semifinal-total-points');
        case 'semifinal-jury':
          return getNumber(b, 'data-semifinal-jury-points') - getNumber(a, 'data-semifinal-jury-points');
        case 'semifinal-jury-asc':
          return getNumber(a, 'data-semifinal-jury-points') - getNumber(b, 'data-semifinal-jury-points');
        case 'semifinal-televote':
          return getNumber(b, 'data-semifinal-televote-points') - getNumber(a, 'data-semifinal-televote-points');
        case 'semifinal-televote-asc':
          return getNumber(a, 'data-semifinal-televote-points') - getNumber(b, 'data-semifinal-televote-points');
      }
    });

    // Re-render sorted items
    grid.innerHTML = '';
    items.forEach(item => grid.appendChild(item));
  }

  sortSelect.addEventListener('change', () => sortItems(sortSelect.value));

  // 🔁 Trigger default sort on load
  sortItems(sortSelect.value);
});
