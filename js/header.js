// header.js
import { supabase } from './supabaseClient.js';

/* ------------------------------------------------------
   1. INITIAL HEADER LOAD
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

/* ------------------------------------------------------
   2. LOAD HEADER + SET BANNERS
------------------------------------------------------- */
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

    // Render Lucide icons
    if (window.lucide) window.lucide.createIcons();

    const banner = document.getElementById("country-banner");
    if (!banner) return;

    // Page detection
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

    /* -------------------------------------------
       DYNAMIC BANNERS (unchanged from your version)
    -------------------------------------------- */
    if (isWinnersPage) {
        banner.src = "/banners/winners.png";
        banner.alt = "Winners";

    } else if (isIndexPage) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "Home";

    } else if (isFavouritesPage) {
        banner.src = "/banners/fanfavorites.png";
        banner.alt = "Fan Favourites";

    } else if (isEditionPage && editionYear) {
        const { data } = await supabase
            .from("douzepoints")
            .select("LocationCountry")
            .eq("Year", editionYear)
            .limit(1);

        const locationCode = data?.[0]?.LocationCountry?.toLowerCase();
        if (locationCode) {
            banner.src = `/banners/${editionYear}.png`;
            banner.alt = editionYear;
        }

    } else if (isCountryPage && country) {
        const { data } = await supabase
            .from("douzepoints")
            .select("Country_Code")
            .ilike("Country", country)
            .limit(1);

        const code = data?.[0]?.Country_Code?.toLowerCase();
        if (code) {
            const bannerPath = `/banners/${code}.png`;
            banner.src = bannerPath;
            banner.alt = country;
            console.log("✅ Country banner set:", bannerPath);
        }

    } else if (isAboutPage) {
        banner.src = "/banners/about.png";
        banner.alt = "About";

    } else if (isScoreboardPage) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "Scoreboard";

    } else if (isContactPage) {
        banner.src = "/banners/contact.png";
        banner.alt = "Contact";

    } else if (isFAQPage) {
        banner.src = "/banners/faq.png";
        banner.alt = "FAQ";

    } else if (isPrivacyPage) {
        banner.src = "/banners/privacy.png";
        banner.alt = "Privacy";
    }
}


/* ------------------------------------------------------
   3. GLOBAL LOGOUT FUNCTION
------------------------------------------------------- */
window.logout = async function () {
    await supabase.auth.signOut();
    window.location.href = "login.html";
};


/* ------------------------------------------------------
   4. USER PROFILE CREATION AFTER EMAIL CONFIRMATION
------------------------------------------------------- */
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event !== "SIGNED_IN" || !session) return;

    const user = session.user;
    if (!user) return;

    console.log("🔐 User signed in:", user.email);

    // Check if profile exists
    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!existing) {
        console.log("🆕 Creating profile row for:", user.email);

        await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata.full_name || null,
            subscription_level: "basic"
        });
    }
});
