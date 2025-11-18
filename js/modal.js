/* -------------------------------------------------------------
   1. PRELOAD MODAL.HTML BEFORE ANY VIDEO IS CLICKED
   ------------------------------------------------------------- */

window.modalReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("modal-container");
    if (!container) {
      console.warn("modal-container not found. Modal HTML not loaded.");
      resolve(); // resolve anyway so play doesn't hang
      return;
    }

    fetch("modal.html")
      .then(response => response.text())
      .then(html => {
        container.innerHTML = html;
        resolve(); // modal is now fully ready for use
      })
      .catch(err => {
        console.error("Failed to load modal.html:", err);
        resolve(); // still resolve to prevent blocking
      });
  });
});


/* -------------------------------------------------------------
   1b. VIEW LOGGING STATE & FUNCTIONS (NEW)
   ------------------------------------------------------------- */

let activeViewId = null;
let viewStartTime = null;

async function logViewStart(entryOrUrl) {
  // Uses global supabase client
  const supabase = window.supabaseClient;
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return;

  // Prefer Video_Lookup from entry, fall back to URL
  let videoLookup = null;
  if (entryOrUrl && typeof entryOrUrl === "object" && entryOrUrl.Video_Lookup) {
    videoLookup = entryOrUrl.Video_Lookup;
  } else {
    videoLookup = entryOrUrl;
  }

  const { data: inserted, error } = await supabase
    .from("video_views")
    .insert({
      user_id: user.id,
      video_lookup: videoLookup,
      start_time: new Date().toISOString()
    })
    .select()
    .single();

  if (!error && inserted) {
    activeViewId = inserted.id;
    viewStartTime = Date.now();
  }
}

async function logViewEnd() {
  const supabase = window.supabaseClient;
  if (!supabase) return;
  if (!activeViewId || !viewStartTime) return;

  const duration = Math.round((Date.now() - viewStartTime) / 1000);

  await supabase
    .from("video_views")
    .update({
      end_time: new Date().toISOString(),
      duration_seconds: duration
    })
    .eq("id", activeViewId);

  activeViewId = null;
  viewStartTime = null;
}


/* -------------------------------------------------------------
   2. GOOGLE DRIVE + DIRECT VIDEO HANDLER
   ------------------------------------------------------------- */

window.GDriveOpenModalWithVideo = function(videoUrl, titleText, entry) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal) {
    console.error("[modal.js] videoModal element missing.");
    return;
  }

  // ⭐ Start logging when modal opens
  logViewStart(entry || videoUrl);

  modal.style.display = "flex";

  // Reset both elements
  if (video) {
    video.pause();
    video.style.display = "none";
    video.src = "";
  }
  if (iframe) {
    iframe.style.display = "none";
    iframe.src = "";
  }

  // Google Drive video
  if (videoUrl.includes("drive.google.com")) {
    const match = videoUrl.match(/\/d\/(.*?)\//) || videoUrl.match(/id=([^&]+)/);
    const fileId = match && match[1] ? match[1] : null;

    if (fileId && iframe) {
      iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
      iframe.style.display = "block";
    }
  }

  // Standard MP4 or other direct video file
  else if (video) {
    video.src = videoUrl;
    video.style.display = "block";
    video.play().catch(err => {
      console.warn("Autoplay failed:", err);
    });
  }
};


/* -------------------------------------------------------------
   3. UNIVERSAL OPEN FUNCTION (CALLED FROM ANY PAGE)
   ------------------------------------------------------------- */

window.openVideoModal = async function(arg1, arg2) {
  // Wait for modal.html to be fully loaded before opening
  await window.modalReady;

  let videoUrl = null;
  let entry = null;

  // Signature: openVideoModal({ url, entry })
  if (arg1 && typeof arg1 === "object" && arg1.url) {
    videoUrl = arg1.url;
    entry = arg1.entry || null;
  }
  // Signature: openVideoModal(videoUrl, entry)
  else {
    videoUrl = arg1;
    entry = arg2 || null;
  }

  if (!videoUrl) {
    console.error("[modal.js] openVideoModal called without a video URL");
    return;
  }

  // Optional title text
  let titleText = "";
  if (entry) {
    const artist = entry.Artist || "";
    const song = entry.Song || "";
    titleText = [artist, song].filter(Boolean).join(" — ");
  }

  // ⭐ Pass entry through so logging has full metadata
  window.GDriveOpenModalWithVideo(videoUrl, titleText, entry);
};


/* -------------------------------------------------------------
   4. CLOSE MODAL
   ------------------------------------------------------------- */

window.GDriveCloseModal = function(event) {
  if (event) event.stopPropagation();

  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal) return;

  // ⭐ End logging when modal closes
  logViewEnd();

  // Stop playback & reset
  if (video) {
    video.pause();
    video.src = "";
    video.style.display = "none";
  }
  if (iframe) {
    iframe.src = "";
    iframe.style.display = "none";
  }

  modal.style.display = "none";
};


/* -------------------------------------------------------------
   5. OPTIONAL PREVIEW HOVER HELPERS (USED ON GRID PAGES)
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
