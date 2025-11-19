/* =====================================================================
   0.  SUPABASE CLIENT + WATCH SESSION STATE
   ===================================================================== */

const supabase = window.supabaseClient || null;

// Stores current video session until modal closes
let currentWatchSession = null;


/* =====================================================================
   1. LOAD modal.html INTO #modal-container
   ===================================================================== */

window.modalReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("modal-container");
    if (!container) return resolve();

    fetch("modal.html")
      .then((res) => res.text())
      .then((html) => {
        container.innerHTML = html;
        resolve();
      })
      .catch(() => resolve());
  });
});


/* =====================================================================
   2. UNIVERSAL ENTRY POINT
   Called from video.js:
   openVideoModal({ url, entry })
   ===================================================================== */

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

  window.openDriveOrDirectVideo(videoUrl, entry);
};


/* =====================================================================
   3. GOOGLE DRIVE → DIRECT STREAMABLE URL
   This version WORKS inside a <video> element.
   ===================================================================== */

function convertGoogleDriveToDirect(url) {
  if (!url.includes("drive.google.com")) return url;

  const match = url.match(/\/d\/(.*?)\//);
  if (!match || !match[1]) return url;

  const fileId = match[1];

  // BEST streaming URL (works for video/mp4)
  return `https://drive.googleusercontent.com/uc?id=${fileId}&export=download`;
}


/* =====================================================================
   4. OPEN MODAL + PLAY VIDEO
   ===================================================================== */

window.openDriveOrDirectVideo = function (rawUrl, entry) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal || !video) return;

  // NEVER use iframe for Drive anymore — Google blocks it
  if (iframe) {
    iframe.src = "";
    iframe.style.display = "none";
  }

  // Reset video element
  video.pause();
  video.src = "";
  video.style.display = "block";

  // Convert Drive → streamable MP4
  const playableUrl = convertGoogleDriveToDirect(rawUrl);

  // Start watch session
  currentWatchSession = {
    videoLookup: entry?.Video_Lookup || null,
    startTime: new Date()
  };

  // Show modal
  modal.style.visibility = "visible";
  modal.style.display = "flex";
  modal.classList.add("show");

  // Load & play video
  video.src = playableUrl;
  setTimeout(() => {
    video.play().catch((err) => {
      console.warn("Video play error:", err);
    });
  }, 120);
};


/* =====================================================================
   5. LOG WATCH SESSION INTO Supabase
   ===================================================================== */

async function logWatchSession() {
  if (!currentWatchSession?.videoLookup) return;
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;
  if (!user) return;

  const end = new Date();
  const start = currentWatchSession.startTime || end;

  const durationSeconds = Math.max(0, Math.round((end - start) / 1000));

  await supabase.from("video_views").insert({
    user_id: user.id,
    video_lookup: currentWatchSession.videoLookup,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_seconds: durationSeconds
  });

  currentWatchSession = null;
}


/* =====================================================================
   6. CLOSE MODAL (× button or click outside)
   ===================================================================== */

window.GDriveCloseModal = async function (event) {
  if (event) event.stopPropagation();

  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");

  if (!modal) return;

  // Stop playback
  if (video) {
    video.pause();
    video.src = "";
  }

  // Log watch time
  await logWatchSession();

  // Hide modal completely
  modal.classList.remove("show");
  modal.style.display = "none";
  modal.style.visibility = "hidden";
};


/* =====================================================================
   7. CLICK OUTSIDE MODAL CONTENT TO CLOSE
   ===================================================================== */

document.addEventListener("click", (e) => {
  const modal = document.getElementById("videoModal");
  if (!modal || !modal.classList.contains("show")) return;

  const content = document.querySelector(".modal-content");
  if (!content) return;

  if (!content.contains(e.target)) {
    GDriveCloseModal(e);
  }
});
