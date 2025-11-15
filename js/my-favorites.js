// my-favorites.js
// Loads the favourited videos from Supabase

const supabase = window.supabaseClient;

document.addEventListener("DOMContentLoaded", initFavoritesPage);

async function initFavoritesPage() {

    // 1. Get logged in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    const userId = user.id;

    // 2. Retrieve favourite video IDs from user_favorites
    const { data: favData, error: favError } = await supabase
        .from("user_favorites")
        .select("video_id")
        .eq("user_id", userId);

    if (favError) {
        console.error("Error loading favourites:", favError);
        return showMessage("Error loading favorites.");
    }

    if (!favData || favData.length === 0) {
        return showMessage("You haven't favourited any videos yet.");
    }

    // Extract IDs
    const favIds = favData.map(row => row.video_id);

    // 3. Fetch matching videos from douzepoints (using Video_Lookup)
    const { data: videos, error: videoError } = await supabase
        .from("douzepoints")
        .select("*")
        .in("Video_Lookup", favIds);

    if (videoError) {
        console.error("Error loading video details:", videoError);
        return showMessage("Error loading video data.");
    }

    if (!videos || videos.length === 0) {
        return showMessage("No videos found for your favourites.");
    }

    // 4. Render using the SAME renderer from video.js
    window.renderVideos(videos);

    // Re-render Lucide icons
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
}

// Display a nice message
function showMessage(msg) {
    document.getElementById("video-container").innerHTML =
        `<p style="padding:20px;">${msg}</p>`;
}
