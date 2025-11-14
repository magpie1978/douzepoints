import { supabase } from './supabaseClient.js';

/* ------------------------------------------------------
   INITIAL HEADER LOAD
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

/* ------------------------------------------------------
   LOAD HEADER + SET BANNERS (for pages that have one)
------------------------------------------------------- */
async function loadHeader() {
    const path = window.location.pathname;

    // Insert header
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");

    if (!headerContainer) {
        console.error("header-container element not found");
        return;
    }

    headerContainer.innerHTML = headerHtml;

    // Render Lucide icons
    if (window.lucide) window.lucide.createIcons();

    // Banner element ONLY exists on country.html
    const banner = document.getElementById("country-banner");

    // If no banner on this page → do nothing else (safe!)
    if (!banner) {
        console.info("No banner detected on this page — skipping banner logic.");
        return;
    }

    /* -------------------------
       BANNER LOGIC (unchanged)
       ------------------------- */

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
   GLOBAL LOGOUT FUNCTION (available everywhere)
------------------------------------------------------- */
window.logout = async function () {
    await supabase.auth.signOut();
    window.location.href = "login.html";
};


/* ------------------------------------------------------
   USER PROFILE CREATION (Triggered AFTER sign-in)
------------------------------------------------------- */
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event !== "SIGNED_IN" || !session) return;

    const user = session.user;

    // Does profile exist?
    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!existing) {
        console.log("🆕 Creating user profile for:", user.email);

        await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata.full_name || null,
            subscription_level: "basic"
        });
    }
});
