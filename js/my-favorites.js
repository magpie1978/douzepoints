// my-favorites.js
// Loads only the videos the user has marked as favourite

const supabase = window.supabaseClient;

document.addEventListener("DOMContentLoaded", initFavoritesPage);

async function initFavoritesPage() {

    // 1. Ensure user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // If somehow user is not logged in → send to login
        window.location.href = "login.html";
        return;
    }

    // 2. Load favourite video IDs from user_favorites
    const { data: favRows, error: favError } = await supabase
        .from("user_favorites")
        .select("video_id")
        .eq("user_id", user.id);

    if (favError) {
        console.error("Error loading favourites:", favError);
        document.getElementById("video-container").innerHTML =
            "<p style='padding:20px;'>Error loading favourites.</p>";
        return;
    }

    if (!favRows || favRows.length === 0) {
        document.getElementById("video-container").innerHTML =
            "<p style='padding:20px;'>You haven’t favourited any videos yet.</p>";
        return;
    }

    // Extract IDs
    const favIds = favRows.map(r => r.video_id);

    // 3. Fetch matching videos from douzepoints
    const { data: videos, error: vidError } = await supabase
        .from("douzepoints")
        .select("*")
        .in("ID", favIds);   // Update column name if needed!

    if (vidError) {
        console.error("Error fetching video data:", vidError);
        document.getElementById("video-container").innerHTML =
            "<p style='padding:20px;'>Error fetching video details.</p>";
        return;
    }

    if (!videos || videos.length === 0) {
        document.getElementById("video-container").innerHTML =
            "<p style='padding:20px;'>No videos found for your favourites.</p>";
        return;
    }

    // 4. Render using the SAME renderer used everywhere else
    window.renderVideos(videos);

    // 5. Refresh Lucide icons
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
}
