function openModalWithVideo(videoUrl) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'flex';

  let videoContent;

  // Check if it's a YouTube URL
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  if (isYouTube) {
    let videoId = '';

    try {
      if (videoUrl.includes('youtu.be')) {
        videoId = videoUrl.split('/').pop().split('?')[0];
      } else {
        const url = new URL(videoUrl);
        videoId = url.searchParams.get('v');
      }
    } catch (e) {
      console.error('Invalid YouTube URL:', videoUrl);
    }

    if (videoId) {
      videoContent = `
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
          frameborder="0"
          allow="autoplay; encrypted-media"
          allowfullscreen
          style="width: 100%; height: 80vh;"
        ></iframe>
      `;
    } else {
      videoContent = `<div style="color: white;">Invalid YouTube link</div>`;
    }
  } else {
    videoContent = `
      <video 
        src="${videoUrl}" 
        controls 
        autoplay 
        controlsList="nodownload" 
        oncontextmenu="return false"
      ></video>
    `;
  }

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="document.body.removeChild(this.closest('.modal'))">&times;</span>
      ${videoContent}
    </div>
  `;

  document.body.appendChild(modal);
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



