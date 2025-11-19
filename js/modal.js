/* ============================================================
   0.  SUPABASE CLIENT + WATCH SESSION STATE
   ============================================================ */

const supabase = window.supabaseClient || null;

// Store video watch session until modal closes
let currentWatchSession = null;


/* ============================================================
   1. LOAD modal.html INTO #modal-container
   ============================================================ */

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


/* ============================================================
   2. UNIVERSAL ENTRY POINT
   Called from video.js as:
   openVideoModal({ url, entry })
   ============================================================ */

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


/* ============================================================
   3. GOOGLE DRIVE → DIRECT DOWNLOAD MP4 URL
   ============================================================ */

function convertGoogleDriveToDirect(url) {
  if (!url.includes("drive.google.com")) return url;

  const match = url.match(/\/d\/(.*?)\//);
  if (!match || !match[1]) return url;

  const fileId = match[1];

  // Direct MP4-stream URL (works in <video>)
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}


/* ============================================================
   4. OPEN MODAL + PLAY VIDEO
   ============================================================ */

window.openDriveOrDirectVideo = function (rawUrl, entry) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal || !video) return;

  // Hide iframe completely (Drive forbids iframe preview)
  if (iframe) {
    iframe.src = "";
    iframe.style.display = "none";
  }

  // Reset video player
  video.pause();
  video.src = "";
  video.style.display = "block";

  // Turn Drive preview URL → direct MP4-stream URL
  const playableUrl = convertGoogleDriveToDirect(rawUrl);

  // Begin watch session
  currentWatchSession = {
    videoLookup: entry?.Video_Lookup || null,
    startTime: new Date()
  };

  // Show modal
  modal.style.display = "flex";
  modal.style.visibility = "visible";
  modal.classList.add("show");

  // Load video
  video.src = playableUrl;
  setTimeout(() => {
    video.play().catch(() => {});
  }, 100);
};


/* ============================================================
   5. LOG WATCH SESSION INTO Supabase
   ============================================================ */

async function logWatchSession() {
  if (!currentWatchSession?.videoLookup) return;
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;
  if (!user) return;

  const endTime = new Date();
  const startTime = currentWatchSession.startTime || endTime;
  const duration = Math.max(0, Math.round((endTime - startTime) / 1000));

  await supabase.from("video_views").insert({
    user_id: user.id,
    video_lookup: currentWatchSession.videoLookup,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_seconds: duration
  });

  currentWatchSession = null;
}


/* ============================================================
   6. CLOSE MODAL (× button or click outside)
   ============================================================ */

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

  // Log watch session before hiding
  await logWatchSession();

  // Hide modal
  modal.classList.remove("show");
  modal.style.display = "none";
  modal.style.visibility = "hidden";
};


/* ============================================================
   7. CLICK OUTSIDE MODAL TO CLOSE
   ============================================================ */

document.addEventListener("click", (e) => {
  const modal = document.getElementById("videoModal");
  if (!modal || !modal.classList.contains("show")) return;

  const content = document.querySelector(".modal-content");
  if (!content) return;

  if (!content.contains(e.target)) {
    GDriveCloseModal(e);
  }
});
