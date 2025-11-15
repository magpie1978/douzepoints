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

    // 2. Retrieve favourite video IDs
    const { data: favRows, error: favError } = await supabase
        .from("user_favorites")
        .select("video_id")
        .eq("user_id", user.id);

    if (favError) {
        console.error("Error loading favourites:", favError);
        return showMessage("Error loading favourites.");
    }

    if (!favRows || favRows.length === 0) {
        return showMessage("You haven't favourited any videos yet.");
    }

    const favIds = favRows.map(row => row.video_id);
    console.log("FAV IDS:", favIds);

    // 3. Fetch matching videos from douzepoints
    const { data: videos, error: videoError } = await supabase
        .from("douzepoints")
        .select("*")
        .in("Video_Lookup", favIds);

    if (videoError) {
        console.error("Error loading video data:", videoError);
        return showMessage("Error loading video data.");
    }

    if (!videos || videos.length === 0) {
        return showMessage("No videos found for your favourites.");
    }

    // 4. Render using video.js
    await window.ensureFavoritesLoaded?.(); // allows hearts to be correct

    window.renderVideos(videos);

    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
}

// Display a nice message
function showMessage(msg) {
    document.getElementById("video-container").innerHTML =
        `<p style="padding:20px;">${msg}</p>`;
}
