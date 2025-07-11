function GDriveOpenModalWithVideo(url) {
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (url.includes("drive.google.com")) {
    iframe.src = url.replace("/view", "/preview");
    iframe.style.display = "block";
    video.style.display = "none";
  } else {
    video.src = url;
    video.style.display = "block";
    iframe.style.display = "none";
  }

  document.getElementById("videoModal").style.display = "flex";
}

function GDriveCloseModal(event) {
  if (event.target.classList.contains("modal") || event.target.classList.contains("close-button")) {
    const modal = document.getElementById("videoModal");
    const video = document.getElementById("modalVideo");
    const iframe = document.getElementById("modalIframe");

    modal.style.display = "none";
    video.pause();
    video.src = "";
    iframe.src = "";
  }
}