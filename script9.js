function openModalWithVideo(videoUrl, titleText) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");
  const titleBar = document.getElementById("modalTitle");

  modal.style.display = "flex";
  video.style.display = "none";
  iframe.style.display = "none";
  video.pause();
  iframe.src = "";
  titleBar.textContent = titleText || '';

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
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      iframe.style.display = "block";
    }
  } else {
    video.src = videoUrl;
    video.style.display = "block";
    video.play();
  }
}

function closeModal(event) {
  event.stopPropagation();
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  video.pause();
  video.src = "";
  iframe.src = "";
  modal.style.display = "none";
}