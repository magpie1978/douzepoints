window.GDriveOpenModalWithVideo = function(videoUrl, titleText) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");
  modal.style.display = "flex";
  video.style.display = "none";
  iframe.style.display = "none";
  video.pause();
  iframe.src = "";
  if (videoUrl.includes('drive.google.com')) {
    const match = videoUrl.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      iframe.src = `https://drive.google.com/file/d/${match[1]}/preview`;
      iframe.style.display = "block";
    }
  } else {
    video.src = videoUrl;
    video.style.display = "block";
    video.play();
  }
};

window.GDriveCloseModal = function(event) {
  event.stopPropagation();
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");
  video.pause();
  video.src = "";
  iframe.src = "";
  modal.style.display = "none";
};

window.showPreview = function(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  img.style.display = 'none';
  video.style.display = 'block';
  video.play();
};

window.hidePreview = function(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  video.pause();
  video.style.display = 'none';
  img.style.display = 'block';
};
