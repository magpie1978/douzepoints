/* -------------------------------------------------------------
   0. SUPABASE + WATCH SESSION STATE
   ------------------------------------------------------------- */

const supabase = window.supabaseClient || null;

// Track the user's current watch session
let currentWatchSession = null;


/* -------------------------------------------------------------
   1. PRELOAD modal.html INTO #modal-container
   ------------------------------------------------------------- */

window.modalReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("modal-container");
    if (!container) {
      console.warn("modal-container not found. Modal HTML not loaded.");
      return resolve();
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
   2. GOOGLE DRIVE + DIRECT VIDEO HANDLER
   ------------------------------------------------------------- */

function convertDriveUrl(url) {
  if (!url.includes("drive.google.com")) return url;

  const match = url.match(/\/d\/(.*?)\//);
  if (!match || !match[1]) return url;

  const id = match[1];

  // STREAMABLE Google Drive download URL
  return `https://drive.googleusercontent.com/uc?id=${id}&export=download`;
}

window.GDriveOpenModalWithVideo = function(videoUrl, titleText, entry = null) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal) {
    console.error("[modal.js] videoModal element missing.");
    return;
  }

  modal.style.display = "flex";

  // Reset media elements
  if (video) {
    video.pause();
    video.src = "";
    video.style.display = "none";
  }
  if (iframe) {
    iframe.src = "";
    iframe.style.display = "none";
  }

  // Begin watch session (only if we have entry + Video_Lookup)
  currentWatchSession = {
    videoLookup: entry?.Video_Lookup || null,
    startTime: new Date()
  };

  // Always use direct video streaming for Google Drive now
  const playableUrl = convertDriveUrl(videoUrl);

  // Show MP4 or Drive-stream video
  if (video) {
    video.src = playableUrl;
    video.style.display = "block";

    setTimeout(() => {
      video.play().catch(err => console.warn("Video play error:", err));
    }, 120);
  }
};


/* -------------------------------------------------------------
   3. UNIVERSAL OPEN FUNCTION (CALLED FROM ANY PAGE)
   ------------------------------------------------------------- */

window.openVideoModal = async function(arg1, arg2) {
  await window.modalReady;

  let videoUrl = null;
  let entry = null;

  if (arg1 && typeof arg1 === "object" && arg1.url) {
    videoUrl = arg1.url;
    entry = arg1.entry || null;
  } else {
    videoUrl = arg1;
    entry = arg2 || null;
  }

  if (!videoUrl) {
    console.error("[modal.js] openVideoModal called without a video URL");
    return;
  }

  // Optional title text (unused visually)
  let titleText = "";
  if (entry) {
    const a = entry.Artist || "";
    const s = entry.Song || "";
    titleText = [a, s].filter(Boolean).join(" — ");
  }

  window.GDriveOpenModalWithVideo(videoUrl, titleText, entry);
};


/* -------------------------------------------------------------
   4. LOG WATCH SESSION TO SUPABASE
   ------------------------------------------------------------- */

async function logWatchSession() {
  if (!supabase) {
    console.warn("[modal.js] Supabase client not available.");
    return;
  }

  if (!currentWatchSession?.videoLookup) return;

  // Get authenticated user
  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;
  if (!user) return;

  const endTime = new Date();
  const startTime = currentWatchSession.startTime || endTime;

  const durationSeconds = Math.max(
    0,
    Math.round((endTime - startTime) / 1000)
  );

  await supabase.from("video_views").insert({
    user_id: user.id,
    video_lookup: currentWatchSession.videoLookup,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_seconds: durationSeconds
  });

  currentWatchSession = null;
}


/* -------------------------------------------------------------
   5. CLOSE MODAL
   ------------------------------------------------------------- */

window.GDriveCloseModal = async function(event) {
  if (event) event.stopPropagation();

  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal) return;

  // Stop playback & reset
  if (video) {
    video.pause();
    video.src = "";
    video.style.display = "none";
  }
  if (iframe) {
    iframe.src = "";
  }

  // 🔥 Log watch time to Supabase
  await logWatchSession();

  modal.style.display = "none";
};


/* -------------------------------------------------------------
   6. OPTIONAL PREVIEW HOVER HELPERS
   ------------------------------------------------------------- */

window.showPreview = function(container) {
  const video = container.querySelector("video");
  const img = container.querySelector("img");
  if (!video || !img) return;

  img.style.display = "none";
  video.style.display = "block";
  video.play().catch(() => {});
};

window.hidePreview = function(container) {
  const video = container.querySelector("video");
  const img = container.querySelector("img");
  if (!video || !img) return;

  video.pause();
  video.style.display = "none";
  img.style.display = "block";
};
