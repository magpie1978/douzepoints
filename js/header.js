// header.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

async function loadHeader() {
    const path = window.location.pathname;

    // Load header.html
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) {
        console.error("header-container element not found");
        return;
    }
    headerContainer.innerHTML = headerHtml;

    if (window.lucide) window.lucide.createIcons();

    // Many pages DO NOT have a banner — do NOT break the site.
    const banner = document.getElementById("country-banner");
    if (!banner) {
        console.warn("No #country-banner element on this page.");
        return;     // ← ONLY exits loadHeader(), safely
    }

    /* existing banner logic BELOW (unchanged) */
    const isIndexPage = path === "/" || path.endsWith("index.html");
    const country = new URLSearchParams(window.location.search).get("country");
    const editionYear = new URLSearchParams(window.location.search).get("edition");

    const isCountryPage = path.includes("country.html");
    const isEditionPage = path.includes("edition.html");
    const isWinnersPage = path.includes("winners.html");
    const isFavouritesPage = path.includes("fan-favorites.html");
    const isAboutPage = path.includes("about.html");
    const isContactPage = path.includes("contact.html");
    const isFAQPage = path.includes("faq.html");
    const isPrivacyPage = path.includes("privacy.html");
    const isScoreboardPage = path.includes("scoreboard.html");

    /* your banner logic continues here... */
}

/* LOGOUT FUNCTION */
window.logout = async function () {
    await supabase.auth.signOut();
    window.location.href = "login.html";
};

/* PROFILE CREATION */
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event !== "SIGNED_IN" || !session) return;

    const user = session.user;

    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!existing) {
        await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata.full_name || null,
            subscription_level: "basic"
        });
    }
});
