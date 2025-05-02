function openModalWithVideo(videoUrl) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'flex';

  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');

  const closeButton = document.createElement('span');
  closeButton.classList.add('close-button');
  closeButton.innerHTML = '&times;';
  closeButton.onclick = () => document.body.removeChild(modal);

  modalContent.appendChild(closeButton);

  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
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
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`;
      iframe.allow = 'autoplay; encrypted-media';
      iframe.allowFullscreen = true;
      iframe.frameBorder = '0';
      iframe.style.width = '100%';
      iframe.style.height = '80vh';

      modalContent.appendChild(iframe);
    } else {
      const errorText = document.createElement('div');
      errorText.style.color = 'white';
      errorText.textContent = 'Invalid YouTube URL';
      modalContent.appendChild(errorText);
    }
  } else {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.controlsList = 'nodownload';
    video.oncontextmenu = () => false;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '80vh';

    modalContent.appendChild(video);
  }

  modal.appendChild(modalContent);
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

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="document.body.removeChild(this.closest('.modal'))">&times;</span>
      ${videoContent}
    </div>
  `;

  document.body.appendChild(modal);
}
