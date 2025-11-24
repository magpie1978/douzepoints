/* -------------------------------------------------------------
   1. PRELOAD MODAL.HTML BEFORE ANY VIDEO IS CLICKED
------------------------------------------------------------- */

window.modalReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("modal-container");
    if (!container) {
      console.warn("modal-container not found. Modal HTML not loaded.");
      resolve();
      return;
    }

    fetch("modal.html")
      .then(r => r.text())
      .then(html => {
        container.innerHTML = html;
        resolve();
      })
      .catch(err => {
        console.error("Failed to load modal.html:", err);
        resolve();
      });
  });
});


/* -------------------------------------------------------------
   2. EXTRACT CLEAN STREAMABLE URL
------------------------------------------------------------- */

function getStreamableUrl(inputUrl) {
  if (!inputUrl) return null;

  // 1️⃣ Handle Google Drive URLs
  if (inputUrl.includes("drive.google.com")) {
    const match = inputUrl.match(/\/d\/(.*?)\//);
    if (match) {
      const fileId = match[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    const matchAlt = inputUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (matchAlt) {
      const fileId = matchAlt[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    console.warn("Could not extract Google Drive file ID from URL:", inputUrl);
  }

  // 2️⃣ If it's an MP4 URL — use directly
  if (inputUrl.endsWith(".mp4") || inputUrl.includes(".mp4?")) {
    return inputUrl;
  }

  // Default fallback
  return inputUrl;
}


/* -------------------------------------------------------------
   3. STANDARD OPEN MODAL FUNCTION
------------------------------------------------------------- */

window.openVideoModal = async function (input, entry) {
  await window.modalReady;

  let videoUrl = null;

  if (typeof input === "object" && input.url) {
    videoUrl = input.url;
    entry = input.entry ?? null;
  } else {
    videoUrl = input;
  }

  const cleanUrl = getStreamableUrl(videoUrl);

  const overlay = document.getElementById("dpModalOverlay");
  const title   = document.getElementById("dpModalTitle");
  const video   = document.getElementById("dpVideo");
  const iframe  = document.getElementById("dpIframe");

  if (!overlay) {
    console.error("[modal.js] Modal overlay not found");
    return;
  }

  // Title
  title.textContent = entry
    ? `${entry.Artist ?? ""} — ${entry.Song ?? ""}`
    : "";

  // Reset
  video.pause();
  video.src = "";
  video.classList.remove("active");

  iframe.src = "";
  iframe.classList.remove("active");

  /* ---------------------------------------------------------
     DETECT WHETHER URL IS Video File or Google Drive Preview
  ---------------------------------------------------------- */

  if (cleanUrl.includes("drive.google.com")) {
    // Use IFRAME for Google Drive preview
    iframe.src = cleanUrl;
    iframe.classList.add("active");
  } else {
    // Use <video> for MP4 files
    video.src = cleanUrl;
    video.classList.add("active");
    video.play().catch(e => console.warn("Autoplay blocked:", e));
  }

  overlay.classList.remove("hidden");
};


/* -------------------------------------------------------------
   4. CLOSE MODAL
------------------------------------------------------------- */

window.closeDpModal = function () {
  const overlay = document.getElementById("dpModalOverlay");
  const video   = document.getElementById("dpVideo");
  const iframe  = document.getElementById("dpIframe");

  if (!overlay) return;

  video.pause();
  video.src = "";
  iframe.src = "";

  overlay.classList.add("hidden");
};
