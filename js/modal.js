/* ============================================================
   LOAD MODAL HTML BEFORE USE
   ============================================================ */
window.modalReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("modal-container");
    if (!container) {
      console.warn("[modal.js] #modal-container missing");
      resolve();
      return;
    }

    try {
      const html = await fetch("modal.html").then(r => r.text());
      container.innerHTML = html;
    } catch (e) {
      console.error("[modal.js] Failed to load modal.html", e);
    }

    resolve();
  });
});


/* ============================================================
   SUPABASE INITIALIZE
   ============================================================ */
const supabaseClient = window.supabaseClient || null;



/* ============================================================
   WATCH SESSION TRACKING
   ============================================================ */
let watchSession = {
  start: null,
  video_lookup: null
};

async function logWatchSession(eventType) {
  if (!supabaseClient) {
    console.warn("[modal.js] No Supabase client");
    return;
  }

  const { data } = await supabaseClient.auth.getUser();
  if (!data?.user) return;

  const now = new Date();

  if (eventType === "start") {
    watchSession.start = now;
    return;
  }

  if (eventType === "end" && watchSession.start && watchSession.video_lookup) {
    const duration = Math.max(
      0,
      Math.round((now - watchSession.start) / 1000)
    );

    await supabaseClient.from("video_views").insert({
      user_id: data.user.id,
      video_lookup: watchSession.video_lookup,
      start_time: watchSession.start.toISOString(),
      end_time: now.toISOString(),
      duration_seconds: duration
    });
  }

  watchSession.start = null;
  watchSession.video_lookup = null;
}



/* ============================================================
   OPEN VIDEO MODAL
   ============================================================ */
window.openVideoModal = async function ({ url, entry }) {
  await window.modalReady;

  const overlay = document.getElementById("dpModalOverlay");
  const modalVideo = document.getElementById("dpVideo");
  const modalIframe = document.getElementById("dpIframe");
  const modalTitle = document.getElementById("dpModalTitle");

  if (!overlay) return;

  /* Reset */
  modalVideo.pause();
  modalVideo.src = "";
  modalVideo.classList.remove("active");

  modalIframe.src = "";
  modalIframe.classList.remove("active");

  /* Title */
  if (entry) {
    modalTitle.textContent =
      `${entry.Artist || ""} — ${entry.Song || ""}`.trim();
  } else {
    modalTitle.textContent = "";
  }

  /* Start watch session */
  watchSession.video_lookup = entry?.Video_Lookup || null;
  logWatchSession("start");

  /* Show modal */
  overlay.classList.remove("hidden");

  /* Handle Google Drive vs MP4 */
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      modalIframe.src =
        `https://drive.google.com/file/d/${match[1]}/preview`;
      modalIframe.classList.add("active");
    }
  } else {
    modalVideo.src = url;
    modalVideo.classList.add("active");
    modalVideo.play();
  }
};



/* ============================================================
   CLOSE VIDEO MODAL
   ============================================================ */
window.closeVideoModal = function () {

  const overlay = document.getElementById("dpModalOverlay");
  const modalVideo = document.getElementById("dpVideo");
  const modalIframe = document.getElementById("dpIframe");

  /* End tracking */
  logWatchSession("end");

  /* Reset */
  modalVideo.pause();
  modalVideo.src = "";
  modalVideo.classList.remove("active");

  modalIframe.src = "";
  modalIframe.classList.remove("active");

  overlay.classList.add("hidden");
};



/* ============================================================
   ATTACH CLOSE BUTTON
   ============================================================ */
document.addEventListener("click", (e) => {
  if (e.target.id === "dpCloseBtn") {
    e.stopPropagation();
    closeVideoModal();
  }
});
