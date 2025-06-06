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
