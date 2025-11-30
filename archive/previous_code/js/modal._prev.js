/* -------------------------------------------------------------
   1. PRELOAD MODAL.HTML
------------------------------------------------------------- */
window.modalReady = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => {
        const container = document.getElementById("modal-container");
        if (!container) return resolve();

        fetch("modal.html")
            .then(r => r.text())
            .then(html => {
                container.innerHTML = html;
                resolve();
            })
            .catch(err => {
                console.error("Failed loading modal.html:", err);
                resolve();
            });
    });
});


/* -------------------------------------------------------------
   SUPABASE (GLOBAL) — FIXED
------------------------------------------------------------- */
const supabase = window.supabaseClient || null;

let currentSession = null;

async function startWatchSession(video_lookup) {
    if (!supabase) return null;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    const { data, error } = await supabase
        .from("video_views")
        .insert({
            user_id: user.id,
            video_lookup,
            start_time: new Date().toISOString()
        })
        .select()
        .single();

    if (error) console.error("Start session error:", error);
    return data;
}

async function endWatchSession() {
    if (!supabase || !currentSession) return;

    const endTime = new Date();
    const startTime = new Date(currentSession.start_time);
    const duration = Math.max(0, Math.floor((endTime - startTime) / 1000));

    const { error } = await supabase
        .from("video_views")
        .update({
            end_time: endTime.toISOString(),
            duration_seconds: duration
        })
        .eq("id", currentSession.id);

    if (error) console.error("End session error:", error);

    currentSession = null;
}


/* -------------------------------------------------------------
   2. OPEN VIDEO MODAL — FIXED
------------------------------------------------------------- */
window.openVideoModal = async function({ url, entry }) {
    await window.modalReady;

    const modal = document.getElementById("videoModal");
    const video = document.getElementById("modalVideo");
    const iframe = document.getElementById("modalIframe");
    const title = document.getElementById("dpModalTitle");

    if (!modal) return;

    // Title
    if (entry) {
        title.textContent = `${entry.Artist || ""} — ${entry.Song || ""}`;
    } else {
        title.textContent = "";
    }

    // Reset
    video.pause();
    video.src = "";
    video.style.display = "none";
    iframe.src = "";
    iframe.style.display = "none";

    // Google Drive preview
    if (url.includes("drive.google.com")) {
        const match = url.match(/\/d\/(.*?)\//);
        if (match && match[1]) {
            iframe.src =
                `https://drive.google.com/file/d/${match[1]}/preview`;
            iframe.style.display = "block";
        }
    }
    // MP4 or direct file
    else {
        video.src = url;
        video.style.display = "block";
        video.play();
    }

    // Watch session
    if (entry?.Video_Lookup) {
        currentSession = await startWatchSession(entry.Video_Lookup);
    }

    modal.classList.add("active");
};


/* -------------------------------------------------------------
   3. CLOSE VIDEO MODAL
------------------------------------------------------------- */
window.GDriveCloseModal = async function(event) {
    if (event) event.stopPropagation();

    await endWatchSession();

    const modal = document.getElementById("videoModal");
    const video = document.getElementById("modalVideo");
    const iframe = document.getElementById("modalIframe");

    if (!modal) return;

    video.pause();
    video.src = "";
    iframe.src = "";

    modal.classList.remove("active");
};


/* Click outside closes modal */
document.addEventListener("click", (e) => {
    const modal = document.getElementById("videoModal");
    if (modal?.classList.contains("active") && e.target === modal) {
        window.GDriveCloseModal(e);
    }
});
