function openModalWithVideo(videoUrl) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'flex';

  let videoContent;

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
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`;

      videoContent = `
        <iframe
          id="yt-player"
          src="${embedUrl}"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen"
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

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="document.body.removeChild(this.closest('.modal'))">&times;</span>
      ${videoContent}
    </div>
  `;

  document.body.appendChild(modal);
}

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="document.body.removeChild(this.closest('.modal'))">&times;</span>
      ${videoContent}
    </div>
  `;

  document.body.appendChild(modal);
}
