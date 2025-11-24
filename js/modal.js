/* -------------------------------------------------------------
   1. PRELOAD MODAL.HTML
------------------------------------------------------------- */
window.modalReady = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => {
        const container = document.getElementById("modal-container");
        if (!container) return resolve();

        fetch("modal.html")
            .then(res => res.text())
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
   2. SUPABASE (GLOBAL ACCESS)
------------------------------------------------------------- */
const supabase = window.supabaseClient || null;

let currentSession = null;

async function startWatchSession(video_lookup) {
    if (!supabase) return null;

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return null;

    const { data: row } = await supabase
        .from("video_views")
        .insert({
            user_id: user.id,
            video_lookup,
            start_time: new Date().toISOString()
        })
        .select()
        .single();

    currentSession = row;
}

async function endWatchSession() {
    if (!supabase || !currentSession) return;

    const end = new Date();
    const start = new Date(currentSession.start_time);
    const duration = Math.max(0, Math.floor((end - start) / 1000));

    await supabase
        .from("video_views")
        .update({
            end_time: end.toISOString(),
            duration_seconds: duration
        })
        .eq("id", currentSession.id);

    currentSession = null;
}


/* -------------------------------------------------------------
   3. OPEN MODAL
------------------------------------------------------------- */
window.openVideoModal = async function({ url, entry }) {
    await window.modalReady;

    const modal = document.getElementById("videoModal");
    const video = document.getElementById("modalVideo");
    const iframe = document.getElementById("modalIframe");
    const title = document.getElementById("dpModalTitle");

    if (!modal) return;

    // Title
    title.textContent = entry
        ? `${entry.Artist || ""} — ${entry.Song || ""}`
        : "";

    // Reset everything
    video.pause();
    video.src = "";
    video.style.display = "none";

    iframe.src = "";
    iframe.style.display = "none";

    // Google Drive preview
    if (url.includes("drive.google.com")) {
        const match = url.match(/\/d\/(.*?)\//);
        if (match && match[1]) {
            iframe.src = `https://drive.google.com/file/d/${match[1]}/preview`;
            iframe.style.display = "block";
        }
    }
    // MP4 or other direct stream
    else {
        video.src = url;
        video.style.display = "block";
        video.play();
    }

    // Start watch-log
    if (entry?.Video_Lookup) {
        startWatchSession(entry.Video_Lookup);
    }

    modal.classList.add("active");
};


/* -------------------------------------------------------------
   4. CLOSE MODAL
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


/* -------------------------------------------------------------
   5. CLOSE WHEN CLICKING OUTSIDE
------------------------------------------------------------- */
document.addEventListener("click", (e) => {
    const modal = document.getElementById("videoModal");

    if (modal?.classList.contains("active") && e.target === modal) {
        window.GDriveCloseModal(e);
    }
});


/* -------------------------------------------------------------
   6. CLOSE BUTTON
------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", (e) => {
        if (e.target.id === "dpModalCloseBtn") {
            GDriveCloseModal(e);
        }
    });
});
