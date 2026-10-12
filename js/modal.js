/* -------------------------------------------------------------
   1. PRELOAD modal.html INTO #modal-container 
------------------------------------------------------------- */

window.modalReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("modal-container");
    if (!container) {
      console.warn("modal-container not found");
      resolve();
      return;
    }

    //fetch("modal.html")
    fetch("/modal.html")
      .then((res) => res.text())
      .then((html) => {
        container.innerHTML = html;
        resolve();
      })
      .catch((err) => {
        console.error("Error loading modal.html:", err);
        resolve();
      });
  });
});


/* -------------------------------------------------------------
   2. UNIVERSAL OPEN FUNCTION
------------------------------------------------------------- */

window.openVideoModal = async function (arg1, arg2) {
  await window.modalReady;

  let videoUrl = null;
  let entry = null;

  if (typeof arg1 === "object" && arg1.url) {
    videoUrl = arg1.url;
    entry = arg1.entry || null;
  } else {
    videoUrl = arg1;
    entry = arg2 || null;
  }

  if (!videoUrl) {
    console.error("[modal.js] No video URL");
    return;
  }

  window.GDriveOpenModalWithVideo(videoUrl, entry);
};


/* -------------------------------------------------------------
   3. OPEN: HANDLE GOOGLE DRIVE OR MP4
------------------------------------------------------------- */
   window.GDriveOpenModalWithVideo = function (videoUrl, entry) {
     const modal = document.getElementById("videoModal");
     const video = document.getElementById("modalVideo");
     const iframe = document.getElementById("modalIframe");
   
     if (!modal) return;
   
     // Ensure clean slate
     video.pause();
     video.src = "";
     iframe.src = "";
     video.style.display = "none";
     iframe.style.display = "none";
   
     // Show modal
     modal.classList.add("show");
   
     // GOOGLE DRIVE (untrackable)
     if (videoUrl.includes("drive.google.com")) {
       const match = videoUrl.match(/\/d\/(.*?)\//);
       if (match && match[1]) {
         iframe.src = `https://drive.google.com/file/d/${match[1]}/preview`;
         iframe.style.display = "block";
         return;
       }
     }

      // YOUTUBE
      if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
        let videoId = null;
      
        // Standard watch URL
        const match1 = videoUrl.match(/[?&]v=([^&]+)/);
        if (match1) videoId = match1[1];
      
        // Short URL
        const match2 = videoUrl.match(/youtu\.be\/([^?]+)/);
        if (match2) videoId = match2[1];
      
        if (videoId) {
          iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
          iframe.style.display = "block";
          return;
        }
      }

      
     // MP4 OR DIRECT VIDEO
     video.src = videoUrl;
     video.style.display = "block";
   
     // ✅ Attach watch tracking
     if (window.attachWatchTracking && entry) {
       window.attachWatchTracking(video, entry);
     }
   
     // Play
     setTimeout(() => video.play().catch(() => {}), 150);
   };




/* -------------------------------------------------------------
   4. CLOSE MODAL
------------------------------------------------------------- */

window.GDriveCloseModal = function (event) {
  if (event) event.stopPropagation();

  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal) return;

  // Stop media
  if (video) {
    video.pause();
    video.src = "";
  }

  if (iframe) {
    iframe.src = "";
  }

  // Hide modal (CSS-controlled)
  modal.classList.remove("show");
};



/* -------------------------------------------------------------
   5. CLICK OUTSIDE TO CLOSE
------------------------------------------------------------- */

document.addEventListener("click", (e) => {
  const modal = document.getElementById("videoModal");
  if (!modal || !modal.classList.contains("show")) return;

  const content = document.querySelector(".modal-content");
  if (!content) return;

  if (!content.contains(e.target) && e.target !== modal) {
    GDriveCloseModal(e);
  }
});
