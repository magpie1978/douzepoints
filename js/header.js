import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
    protectPage();   // 🔒 Protect all pages except login.html
});

// -------------------------------------------------------------
// 🔒 Redirect users to login.html if they are not logged in
// -------------------------------------------------------------
async function protectPage() {
    const { data: { session } } = await supabase.auth.getSession();

    const isLoginPage = window.location.pathname.includes("login.html");

    if (!session && !isLoginPage) {
        console.warn("⛔ No active session — redirecting to login.");
        window.location.href = "login.html";
    }
}

// -------------------------------------------------------------
// 🚀 Load header.html and apply banner + logout logic
// -------------------------------------------------------------
async function loadHeader() {
    const path = window.location.pathname;
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");

    if (!headerContainer) {
        console.error("header-container element not found");
        return;
    }

    headerContainer.innerHTML = headerHtml;

    const banner = document.getElementById("country-banner");

    const isIndexPage      = path === "/" || path.endsWith("index.html");
    const isCountryPage    = path.includes("country.html");
    const isEditionPage    = path.includes("edition.html");
    const isWinnersPage    = path.includes("winners.html");
    const isFavouritesPage = path.includes("fan-favorites.html");
    const isAboutPage      = path.includes("about.html");
    const isContactPage    = path.includes("contact.html");
    const isFAQPage        = path.includes("faq.html");
    const isPrivacyPage    = path.includes("privacy.html");
    const isScoreboardPage = path.includes("scoreboard.html");

    const country = new URLSearchParams(window.location.search).get("country");

    // ---------------------------------------------------------
    // 🎨 Set the banner
    // ---------------------------------------------------------
    if (!banner) return;

    if (isWinnersPage) {
        banner.src = "/banners/winners.png";
        banner.alt = "Winners";

    } else if (isIndexPage) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "Home";

    } else if (isFavouritesPage) {
        banner.src = "/banners/fanfavorites.png";
        banner.alt = "Fan Favourites";

    } else if (isEditionPage) {
        const editionYear = new URLSearchParams(window.location.search).get("edition");

        if (editionYear) {
            const { data } = await supabase
                .from("douzepoints")
                .select("LocationCountry")
                .eq("Year", editionYear)
                .limit(1);

            const locationCode = data?.[0]?.LocationCountry?.toLowerCase();

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
            banner.src = `/banners/${code}.png`;
            banner.alt = country;
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

    // ---------------------------------------------------------
    // 🔴 Logout Button Logic
    // ---------------------------------------------------------
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            console.log("Logout clicked");

            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error("Logout error:", error);
            } else {
                console.log("Logged out successfully");
                window.location.href = "login.html";
            }
        });
    }
}
