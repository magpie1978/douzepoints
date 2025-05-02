/*  LOGIN SCRIPT */
/* if (sessionStorage.getItem("loggedIn") !== "true") { */
/*   window.location.href = "login.html"; */
/* } */


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
  `;

  document.body.appendChild(modal);
}


function OLDcloseModal() {
  const modal = document.getElementById("videoModal");
  modal.style.display = "none";
}

function OLDshowPreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  img.style.display = 'none';
  video.style.display = 'block';
  video.play();
}

function OLDhidePreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  video.pause();
  video.style.display = 'none';
  img.style.display = 'block';
}


function openModalWithVideo(videoUrl) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");

  video.src = videoUrl;
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
  if (event.target === modal || event.target.classList.contains('modal-close')) {
    modal.style.display = "none";
    if (modalId === "videoModal") {
      const video = document.getElementById("modalVideo");
      video.pause();
      video.src = "";
    } else if (modalId === "youtubeModal") {
      const wrapper = document.getElementById("youtubeWrapper");
      wrapper.innerHTML = "";
    }
  }
}
