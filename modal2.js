function GDriveOpenModalWithVideo(videoUrl, titleText) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  modal.style.display = "flex";
  video.style.display = "none";
  iframe.style.display = "none";
  video.pause();
  iframe.src = "";

  if (videoUrl.includes('drive.google.com')) {
    // Use passed-in embed URL directly
    iframe.src = videoUrl;
    iframe.style.display = "block";
  } else {
    video.src = videoUrl;
    video.style.display = "block";
    video.play();
  }
}

function GDriveCloseModal(event) {
  event.stopPropagation();
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");
  video.pause();
  video.src = "";
  iframe.src = "";
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
