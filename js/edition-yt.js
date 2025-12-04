// edition-yt.js
// --------------------------------------------
// Plays videos using YT_URL instead of Video_URL
// Reuses the full rendering engine in video.js
// --------------------------------------------

import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", () => {
    loadEditionYT();
});

// --------------------------------------------
// Load edition data using Supabase
// --------------------------------------------
async function loadEditionYT() {
    const params = new URLSearchParams(window.location.search);
    const year = params.get("edition");

    if (!year) {
        console.warn("No edition year in URL");
        return;
    }

    const { data, error } = await supabase
        .from("douzepoints")
        .select("*")
        .eq("Year", year)
        .order("Final_Rank", { ascending: true });

    if (error) {
        console.error("Error loading edition-yt:", error);
        return;
    }

    if (!data || data.length === 0) {
        const container = document.getElementById("video-container");
        if (container) {
            container.innerHTML = `<p style="padding:20px;">No videos found.</p>`;
        }
        return;
    }

    // ----------------------------------------------------
    // ⭐ OVERRIDE KEY FIELD:
    // Make the renderer think YT_URL *is* the Video_URL
    // ----------------------------------------------------
    const patchedEntries = data.map(entry => ({
        ...entry,
        Video_URL: entry.YT_URL   // ← THE IMPORTANT CHANGE
    }));

    // ----------------------------------------------------
    // Use the existing global renderer from video.js
    // This handles sorting, favourites, modal, etc.
    // ----------------------------------------------------
    if (window.ensureFavoritesLoaded) {
        await window.ensureFavoritesLoaded();
    }

    if (typeof window.renderVideos === "function") {
        window.renderVideos(patchedEntries);
    } else {
        console.error("renderVideos() not found. Ensure video.js is loaded before edition-yt.js.");
    }
}
