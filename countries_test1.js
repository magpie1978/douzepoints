/*  LOGIN SCRIPT */
/* if (sessionStorage.getItem("loggedIn") !== "true") { */
/*   window.location.href = "login.html"; */
/* } */


function S3openModalWithVideo(videoUrl) {
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

function S3closeModal() {
  const modal = document.getElementById("videoModal");
  modal.style.display = "none";
}

function S3showPreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  img.style.display = 'none';
  video.style.display = 'block';
  video.play();
}

function S3hidePreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  video.pause();
  video.style.display = 'none';
  img.style.display = 'block';
}


/* script to display sidebar country selector */
fetch('sidebar.html')
  .then(response => {
    if (!response.ok) {
      throw new Error('Sidebar could not be loaded.');
    }
    return response.text();
  })
  .then(data => {
    document.getElementById('sidebar-container').innerHTML = data;
  })
  .catch(error => {
    console.error('Error loading sidebar:', error);
  });
