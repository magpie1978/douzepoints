/* -------------------------------------------------------------
   0. SUPABASE CLIENT + WATCH SESSION STATE
------------------------------------------------------------- */

const supabase = window.supabaseClient || null;
let currentWatchSession = null;

/* -------------------------------------------------------------
   1. PRELOAD modal.html INTO #modal-container
------------------------------------------------------------- */

window.modalReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("modal-container");
    if (!container) {
      resolve();
      return;
    }

    fetch("modal.html")
      .then((res) => res.text())
      .then((html) => {
        container.innerHTML = html;
        resolve();
      })
      .catch(() => resolve());
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

  window.openModalPlayableVideo(videoUrl, entry);
};


/* -------------------------------------------------------------
   3. CONVERT GOOGLE DRIVE LINKS → DIRECT MP4 STREAM
------------------------------------------------------------- */

function convertDriveUrlToMp4(url) {
  if (!url.includes("drive.google.com")) return url;

  const m = url.match(/\/d\/(.*?)\//);
  if (!m || !m[1]) return url;

  return `https://drive.google.com/uc?export=download&id=${m[1]}`;
}


/* -------------------------------------------------------------
   4. OPEN MODAL + PLAY VIDEO
------------------------------------------------------------- */

window.openModalPlayableVideo = function (url, entry) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");

  if (!modal) return;

  // Reset
  if (iframe) iframe.style.display = "none";
  if (video) {
    video.pause();
    video.src = "";
    video.style.display = "block";
  }

  modal.style.display = "flex";
  modal.style.visibility = "visible";
  modal.classList.add("show");

  // Start watch session
  currentWatchSession = {
    videoLookup: entry?.Video_Lookup || null,
    startTime: new Date()
  };

  // Convert GD → MP4
  const playableUrl = convertDriveUrlToMp4(url);

  video.src = playableUrl;
  setTimeout(() => video.play().catch(() => {}), 120);
};


/* -------------------------------------------------------------
   5. LOG WATCH EVENT IN SUPABASE
------------------------------------------------------------- */

async function logWatchSession() {
  if (!supabase || !currentWatchSession?.videoLookup) return;

  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;
  if (!user) return;

  const end = new Date();
  const start = currentWatchSession.startTime || end;
  const duration = Math.max(0, Math.round((end - start) / 1000));

  await supabase.from("video_views").insert({
    user_id: user.id,
    video_lookup: currentWatchSession.videoLookup,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_seconds: duration
  });

  currentWatchSession = null;
}


/* -------------------------------------------------------------
   6. CLOSE MODAL
------------------------------------------------------------- */

window.GDriveCloseModal = async function (event) {
  if (event) event.stopPropagation();

  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");

  if (!modal) return;

  if (video) {
    video.pause();
    video.src = "";
  }

  await logWatchSession();

  modal.classList.remove("show");
  modal.style.display = "none";
  modal.style.visibility = "hidden";
};


/* -------------------------------------------------------------
   7. CLICK OUTSIDE TO CLOSE
------------------------------------------------------------- */

document.addEventListener("click", (e) => {
  const modal = document.getElementById("videoModal");
  if (!modal || !modal.classList.contains("show")) return;

  const content = document.querySelector(".modal-content");
  if (!content) return;

  if (!content.contains(e.target)) GDriveCloseModal(e);
});
