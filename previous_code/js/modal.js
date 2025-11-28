/* -------------------------------------------------------------
   GLOBAL MODAL ELEMENTS
------------------------------------------------------------- */

const overlay = document.getElementById("dpModalOverlay");
const modalTitle = document.getElementById("dpModalTitle");
const videoEl = document.getElementById("dpVideo");
const iframeEl = document.getElementById("dpIframe");
const closeBtn = document.getElementById("dpCloseBtn");

let watchSession = {
  video_lookup: null,
  start_time: null,
  user_id: null
};


/* -------------------------------------------------------------
   SUPABASE CLIENT
------------------------------------------------------------- */
const supabase = window.supabaseClient || null;


/* -------------------------------------------------------------
   LOG WATCH SESSION
------------------------------------------------------------- */

async function dpLogWatchSession(endTime) {
  if (!supabase || !watchSession.video_lookup) return;

  const startTime = watchSession.start_time;
  if (!startTime) return;

  const duration = Math.max(0, (endTime - startTime) / 1000);

  await supabase.from("video_views").insert({
    user_id: watchSession.user_id,
    video_lookup: watchSession.video_lookup,
    start_time: new Date(startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    duration_seconds: duration
  });
}


/* -------------------------------------------------------------
   OPEN MODAL
------------------------------------------------------------- */

window.openVideoModal = async function ({ url, entry }) {
  if (!url) return;

  // Reset
  videoEl.style.display = "none";
  iframeEl.style.display = "none";
  videoEl.src = "";
  iframeEl.src = "";

  // Title  
  const artist = entry?.Artist || "";
  const song = entry?.Song || "";
  modalTitle.textContent = artist && song ? `${artist} — ${song}` : "";

  // Watch session setup
  const { data } = await supabase.auth.getUser();
  watchSession.user_id = data?.user?.id || null;
  watchSession.video_lookup = entry?.Video_Lookup || null;
  watchSession.start_time = Date.now();

  // Video type handling
  if (url.includes("drive.google.com")) {
    const idMatch = url.match(/\/d\/(.*?)\//);
    if (idMatch && idMatch[1]) {
      iframeEl.src = `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      iframeEl.style.display = "block";
    }
  } else {
    videoEl.src = url;
    videoEl.style.display = "block";
    videoEl.play().catch(() => {});
  }

  overlay.classList.remove("hidden");
};


/* -------------------------------------------------------------
   CLOSE MODAL
------------------------------------------------------------- */

function closeModal() {
  // Log session
  dpLogWatchSession(Date.now());

  // Reset sources
  videoEl.pause();
  videoEl.src = "";
  iframeEl.src = "";

  overlay.classList.add("hidden");
}

closeBtn.addEventListener("click", closeModal);

// Click outside to close
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
