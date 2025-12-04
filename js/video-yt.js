// VIDEO.JS — UMD Supabase client
const supabase = window.supabaseClient;

window.ensureFavoritesLoaded = async function () {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("user_favorites")
        .select("video_id");

    if (error) {
        console.error("Failed to load favorites:", error);
        return [];
    }

    window.favoriteVideos = data.map(row => row.video_id);
};

window.renderVideos = function (entries) {
    const container = document.getElementById("video-container");
    if (!container) return;

    container.innerHTML = entries.map(video => `
        <div class="video-card" data-video="${video.Video_Lookup}">
            <img class="thumb" src="/thumbnails/${video.Video_Lookup.replace(".mp4", ".jpg")}">
            <div class="video-label">
                ${video.Country} — ${video.Song}
            </div>
        </div>
    `).join("");

    bindVideoClicks();
};

function bindVideoClicks() {
    document.querySelectorAll(".video-card").forEach(card => {
        card.addEventListener("click", () => {
            const videoURL = card.dataset.video;
            openVideoModal(videoURL);
        });
    });
}
