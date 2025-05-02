/*  LOGIN SCRIPT */
/* if (sessionStorage.getItem("loggedIn") !== "true") {
  window.location.href = "login.html";
} */

function openModalWithVideo(videoUrl) {
  const modal = document.getElementById("videoModal");
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="closeModal('videoModal', event)">&times;</span>
      <video
        src="${videoUrl}"
        controls
        autoplay
        controlsList="nodownload"
        oncontextmenu="return false"
      ></video>
    </div>
  `;
  modal.style.display = "flex";
}

function openModalWithYouTube(videoId) {
  const modal = document.getElementById("youtubeModal");
  const wrapper = document.getElementById("youtubeWrapper");

  wrapper.innerHTML = `
    <iframe width="100%" height="480"
      src="https://www.youtube.com/embed/${videoId}?autoplay=1"
      frameborder="0"
      allow="autoplay; encrypted-media"
      allowfullscreen>
    </iframe>
  `;
  modal.style.display = "flex";
}

function closeModal(modalId, event) {
  const modal = document.getElementById(modalId);
  if (event.target === modal || event.target.classList.contains('close-button') || event.target.classList.contains('modal-close')) {
    modal.style.display = "none";
    if (modalId === "videoModal") {
      modal.innerHTML = ''; // clear inner HTML to reset video
    } else if (modalId === "youtubeModal") {
      const wrapper = document.getElementById("youtubeWrapper");
      wrapper.innerHTML = "";
    }
  }
}

function showPreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  if (video && img) {
    img.style.display = 'none';
    video.style.display = 'block';
    video.play();
  }
}

function hidePreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  if (video && img) {
    video.pause();
    video.style.display = 'none';
    img.style.display = 'block';
  }
}
