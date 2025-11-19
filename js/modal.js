/* -------------------------------------------------------------
   0. SUPABASE + WATCH SESSION STATE
------------------------------------------------------------- */

const supabase = window.supabaseClient || null;

// Holds the current watch session data while the modal is open
let currentWatchSession = null;

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

    fetch("modal.html")
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
   Called from video.js as: openVideoModal({ url, entry })
------------------------------------------------------------- */

window.openVideoModal = async function (arg1, arg2) {
  await window.modalReady;

  let videoUrl = null;
  let entry = null;

  // Signature: openVideoModal({ url, entry })
  if (typeof arg1 === "object" && arg1.url) {
    videoUrl = arg1.url;
    entry = arg1.entry || null;
  } else {
    // Signature: openVideoModal(videoUrl, entry)
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
   3. OPEN: HANDLE GOOGLE DRIVE OR MP4 + START WATCH SESSION
------------------------------------------------------------- */

window.GDriveOpenModalWithVideo = function (videoUrl, entry) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal) return;

  // Reset media
  if (video) {
    video.pause();
    video.src = "";
    video.style.display = "none";
  }
  if (iframe) {
    iframe.src = "";
    iframe.style.display = "none";
  }

  // Show modal
  modal.classList.add("show");
  modal.style.display = "flex";
  modal.style.visibility = "visible";

  // --- Start watch session tracking ---
  const videoLookup = entry && entry.Video_Lookup ? entry.Video_Lookup : null;
  currentWatchSession = {
    videoLookup,
    startTime: new Date()
  };

  // GOOGLE DRIVE
  if (videoUrl.includes("drive.google.com")) {
    const match = videoUrl.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      if (iframe) {
        iframe.src = `https://drive.google.com/file/d/${match[1]}/preview`;
        iframe.style.display = "block";
      }
      return;
    }
  }

  // MP4 OR DIRECT VIDEO
  if (video) {
    video.src = videoUrl;
    video.style.display = "block";
    setTimeout(() => {
      video.play().catch(() => {});
    }, 150);
  }
};


/* -------------------------------------------------------------
   4. HELPER: LOG WATCH SESSION TO video_views
------------------------------------------------------------- */

async function logWatchSession() {
  if (!supabase) {
    console.warn("[modal.js] Supabase client not available; cannot log watch session.");
    return;
  }
  if (!currentWatchSession || !currentWatchSession.videoLookup) {
    // No video lookup — nothing to log
    return;
  }

  // Get current user
  const { data, error: userError } = await supabase.auth.getUser();
  const user = data?.user || null;

  if (userError || !user) {
    console.warn("[modal.js] No logged-in user; skipping watch logging.", userError);
    return;
  }

  const endTime = new Date();
  const startTime = currentWatchSession.startTime || endTime;
  const durationSeconds = Math.max(
    0,
    Math.round((endTime.getTime() - startTime.getTime()) / 1000)
  );

  try {
    const { error: insertError } = await supabase
      .from("video_views")
      .insert({
        user_id: user.id,
        video_lookup: currentWatchSession.videoLookup,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds
      });

    if (insertError) {
      console.error("[modal.js] Error inserting into video_views:", insertError);
    }
  } catch (e) {
    console.error("[modal.js] Exception while logging watch session:", e);
  } finally {
    currentWatchSession = null;
  }
}


/* -------------------------------------------------------------
   5. CLOSE MODAL (STOP MEDIA + LOG WATCH + HIDE)
------------------------------------------------------------- */

window.GDriveCloseModal = async function (event) {
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

  // Log watch session BEFORE hiding
  await logWatchSession();

  // Hide modal completely
  modal.classList.remove("show");
  modal.style.display = "none";
  modal.style.visibility = "hidden";
};


/* -------------------------------------------------------------
   6. CLICK OUTSIDE TO CLOSE
------------------------------------------------------------- */

document.addEventListener("click", (e) => {
  const modal = document.getElementById("videoModal");
  if (!modal || !modal.classList.contains("show")) return;

  const content = document.querySelector(".modal-content");
  if (!content) return;

  // If click is outside modal content, close
  if (!content.contains(e.target) && e.target !== modal) {
    GDriveCloseModal(e);
  }
});
