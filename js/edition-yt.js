// EDITION-YT.JS — UMD Supabase client
const supabase = window.supabaseClient;

document.addEventListener("DOMContentLoaded", () => {
    loadEditionYT();
});

async function loadEditionYT() {
    if (!supabase) {
        console.error("[edition-yt] Supabase client not available.");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const year = params.get("edition");

    const { data, error } = await supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", year)
        .order("Final_Rank", { ascending: true });

    if (error) {
        console.error("[edition-yt] Error loading data:", error);
        return;
    }

    const patched = data.map(row => ({
        ...row,
        Video_URL: row.YT_URL   // override to use YouTube
    }));

    if (window.ensureFavoritesLoaded) {
        await window.ensureFavoritesLoaded();
    }

    window.renderVideos(patched);
}
