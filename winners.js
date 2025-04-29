/*  LOGIN SCRIPT */
if (sessionStorage.getItem("loggedIn") !== "true") {
  window.location.href = "login.html";
}


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
