/********************************************************************
 *  MODAL LOADING (loads modal.html into #modal-container)
 ********************************************************************/
window.modalReady = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => {
        const container = document.getElementById("modal-container");
        if (!container) {
            console.warn("[modal.js] modal-container not found.");
            resolve();
            return;
        }

        fetch("modal.html")
            .then(r => r.text())
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


/********************************************************************
 *  INTERNAL STATE
 ********************************************************************/
let activeVideoElement = null;
let activeIframe = null;
let watchSessionStart = null;
let currentUserId = null;


/********************************************************************
 *  SUPABASE INITIALISATION
 ********************************************************************/
let supabaseClient = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (window.supabase) {
        supabaseClient = window.supabase;
        const { data } = await supabaseClient.auth.getUser();
        currentUserId = data?.user?.id || null;
    }
});


/********************************************************************
 *  WATCH-TIME LOGGING
 ********************************************************************/
async function startWatchSession() {
    watchSessionStart = new Date();
}

async function endWatchSession(videoLookup) {
    if (!watchSessionStart || !videoLookup || !supabaseClient || !currentUserId) return;

    const end = new Date();
    const durationSeconds = Math.floor((end - watchSessionStart) / 1000);

    if (durationSeconds <= 0) return;

    const { error } = await supabaseClient
        .from("video_views")
        .insert({
            user_id: currentUserId,
            video_lookup: videoLookup,
            start_time: watchSessionStart.toISOString(),
            end_time: end.toISOString(),
            duration_seconds: durationSeconds
        });

    if (error) console.error("[modal.js] Error writing watch session:", error);

    watchSessionStart = null;
}


/********************************************************************
 *  OPEN MODAL (MAIN FUNCTION CALLED BY video.js)
 ********************************************************************/
window.openVideoModal = async function ({ url, entry }) {
    await window.modalReady;

    const overlay = document.getElementById("dpModalOverlay");
    const modal = document.getElementById("videoModal");
    activeVideoElement = document.getElementById("dpVideo");
    activeIframe = document.getElementById("dpIframe");
    const titleEl = document.getElementById("dpModalTitle");

    if (!overlay || !modal || !activeVideoElement || !activeIframe) {
        console.error("[modal.js] Modal elements missing.");
        return;
    }

    // Reset everything first
    activeVideoElement.pause();
    activeVideoElement.src = "";
    activeVideoElement.classList.remove("active");

    activeIframe.src = "";
    activeIframe.classList.remove("active");

    // Title
    if (entry) {
        const artist = entry.Artist || "";
        const song = entry.Song || "";
        titleEl.textContent = [artist, song].filter(Boolean).join(" — ");
    } else {
        titleEl.textContent = "";
    }

    let isGoogleDrive = false;
    let finalUrl = url;

    // Convert share URL → downloadable URL
    if (url.includes("drive.google.com")) {
        const match = url.match(/\/d\/(.*?)\//);
        if (match && match[1]) {
            const fileId = match[1];
            finalUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            isGoogleDrive = true;
        }
    }

    // Show the overlay
    overlay.classList.remove("hidden");

    // Show correct player
    if (isGoogleDrive) {
        activeIframe.src = finalUrl;
        activeIframe.classList.add("active");
    } else {
        activeVideoElement.src = finalUrl;
        activeVideoElement.classList.add("active");
        activeVideoElement.play().catch(err => console.warn("Autoplay blocked:", err));
    }

    // Start watch timer
    startWatchSession();

    // Store lookup for when modal closes
    modal.dataset.lookup = entry?.Video_Lookup || null;
};


/********************************************************************
 *  CLOSE MODAL
 ********************************************************************/
window.closeDpModal = async function () {
    const overlay = document.getElementById("dpModalOverlay");
    const modal = document.getElementById("videoModal");
    activeVideoElement = document.getElementById("dpVideo");
    activeIframe = document.getElementById("dpIframe");

    if (!overlay || !modal) return;

    // Log watch
    const lookup = modal.dataset.lookup || null;
    if (lookup) await endWatchSession(lookup);

    // Stop video
    if (activeVideoElement) {
        activeVideoElement.pause();
        activeVideoElement.src = "";
        activeVideoElement.classList.remove("active");
    }

    // Stop iframe
    if (activeIframe) {
        activeIframe.src = "";
        activeIframe.classList.remove("active");
    }

    overlay.classList.add("hidden");
};


/********************************************************************
 *  CLICK OUTSIDE MODAL → CLOSE
 ********************************************************************/
document.addEventListener("click", (e) => {
    const overlay = document.getElementById("dpModalOverlay");
    const modal = document.getElementById("videoModal");

    if (!overlay || !modal) return;
    if (overlay.classList.contains("hidden")) return;

    const clickedInside = modal.contains(e.target);
    if (!clickedInside) {
        closeDpModal();
    }
});
