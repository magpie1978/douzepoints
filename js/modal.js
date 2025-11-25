/******************************************************************
   1. Load modal.html into #modal-container
******************************************************************/
window.modalReady = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => {
        const container = document.getElementById("modal-container");

        if (!container) {
            console.warn("[modal.js] No modal-container found.");
            resolve();
            return;
        }

        fetch("modal.html")
            .then(res => res.text())
            .then(html => {
                container.innerHTML = html;
                resolve();
            })
            .catch(err => {
                console.error("[modal.js] Failed to load modal.html:", err);
                resolve();
            });
    });
});


/******************************************************************
   2. Tracking state
******************************************************************/
let watchStartTime = null;
let currentVideoLookup = null;


/******************************************************************
   3. Logging to Supabase
******************************************************************/
async function logWatchSession() {
    if (!window.supabaseClient || !currentVideoLookup || !watchStartTime) return;

    const watchEnd = Date.now();
    const duration = Math.max(0, Math.round((watchEnd - watchStartTime) / 1000));

    const { data: userData } = await window.supabaseClient.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    await window.supabaseClient.from("video_views").insert({
        user_id: user.id,
        video_lookup: currentVideoLookup,
        start_time: new Date(watchStartTime).toISOString(),
        end_time: new Date(watchEnd).toISOString(),
        duration_seconds: duration
    });
}


/******************************************************************
   4. Open modal — called by video.js
******************************************************************/
window.openVideoModal = async function (payload) {
    await window.modalReady;

    const overlay = document.getElementById("dpModalOverlay");
    const title = document.getElementById("dpModalTitle");
    const videoEl = document.getElementById("dpVideo");
    const iframeEl = document.getElementById("dpIframe");

    overlay.classList.remove("hidden");

    // reset
    videoEl.pause();
    videoEl.src = "";
    iframeEl.src = "";
    videoEl.classList.remove("active");
    iframeEl.classList.remove("active");

    // extract params
    const videoUrl = payload.url;
    const entry = payload.entry || {};
    currentVideoLookup = entry.Video_Lookup || null;

    // update UI title
    title.textContent = `${entry.Artist || ""} — ${entry.Song || ""}`.trim();

    /**************************************
       Google Drive URL -> direct stream
    **************************************/
    if (videoUrl.includes("drive.google.com")) {
        const match = videoUrl.match(/\/d\/(.*?)\//);
        if (match && match[1]) {
            const fileId = match[1];
            iframeEl.src = `https://drive.google.com/file/d/${fileId}/preview`;
            iframeEl.classList.add("active");
        }
    }
    else {
        videoEl.src = videoUrl;
        videoEl.classList.add("active");
        videoEl.play().catch(() => {});
    }

    // start timer
    watchStartTime = Date.now();
};


/******************************************************************
   5. Close modal
******************************************************************/
window.closeVideoModal = async function () {
    await logWatchSession();

    const overlay = document.getElementById("dpModalOverlay");
    const videoEl = document.getElementById("dpVideo");
    const iframeEl = document.getElementById("dpIframe");

    // stop playback
    videoEl.pause();
    videoEl.src = "";
    iframeEl.src = "";

    overlay.classList.add("hidden");
};


/******************************************************************
   6. Close event listeners
******************************************************************/
document.addEventListener("click", (e) => {
    if (e.target.id === "dpCloseBtn") {
        closeVideoModal();
    }

    if (e.target.id === "dpModalOverlay") {
        closeVideoModal();
    }
});
