function openModalWithVideo(videoUrl) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'flex';

  let videoContent;
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    // Extract video ID and embed
    const videoId = videoUrl.includes('youtu.be')
      ? videoUrl.split('/').pop()
      : new URL(videoUrl).searchParams.get('v');
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
