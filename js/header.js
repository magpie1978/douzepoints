import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

// -------------------------------------------------------------
// 🔒 AUTH STATE PROTECTION (BEST PRACTICE)
// -------------------------------------------------------------
supabase.auth.onAuthStateChange((event, session) => {
    const isLoginPage = window.location.pathname.includes("login.html");

    // If no active session and not on login page → redirect
    if (!session && !isLoginPage) {
        console.warn("⛔ Session missing – redirecting to login.");
        window.location.href = "login.html";
    }
});

// -------------------------------------------------------------
// 🚀 Load header + bind logout button + lucide icon render
// -------------------------------------------------------------
async function loadHeader() {
    const path = window.location.pathname;
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");

    if (!headerContainer) return;

    // Insert header HTML into the page
    headerContainer.innerHTML = headerHtml;

    // -----------------------
    // 🔴 LOGOUT BUTTON
    // -----------------------
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            console.log("Logging out…");

            const { error } = await supabase.auth.signOut({ scope: "local" });

            if (error) {
                console.error("Logout error:", error);
            } else {
                console.log("Logout successful.");
                window.location.href = "login.html";
            }
        });
    }

    // ---------------------------------------------------------
    // ⭐ LUCIDE ICON FIX — Render icons AFTER header is injected
    // ---------------------------------------------------------
    function renderIconsWhenReady() {
        if (window.lucide) {
            window.lucide.createIcons();
            return true;
        }
        return false;
    }

    // Try immediately
    if (!renderIconsWhenReady()) {
        // Retry until lucide loads (usually instant)
        const interval = setInterval(() => {
            if (renderIconsWhenReady()) {
                clearInterval(interval);
            }
        }, 50);
    }

    // ---------------------------------------------------------
    // 🎨 Banner logic (unchanged)
    // ---------------------------------------------------------
    const banner = document.getElementById("country-banner");

    const isIndexPage      = path === "/" || path.endsWith("index.html");
    const isCountryPage    = path.includes("country.html");
    const isEditionPage    = path.includes("edition.html");
    const isWinnersPage    = path.includes("winners.html");
    const isMyFavoritesPage=path.incluudes("favorites.html");
    const isFavouritesPage = path.includes("fan-favorites.html");
    const isAboutPage      = path.includes("about.html");
    const isContactPage    = path.includes("contact.html");
    const isFAQPage        = path.includes("faq.html");
    const isPrivacyPage    = path.includes("privacy.html");
    const isScoreboardPage = path.includes("scoreboard.html");

    const country = new URLSearchParams(window.location.search).get("country");

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

    } else if (isMyFavouritesPage) {
    banner.src = "/banners/fanfavorites.png";
    banner.alt = "My Favourites";

    } else if (isEditionPage) {
        const editionYear = new URLSearchParams(window.location.search).get("edition");
        if (editionYear) {
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
        banner.src = "/banners/scoreboard.png";
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
