import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

// -------------------------------------------------------------
// 🔒 AUTH STATE PROTECTION (BEST PRACTICE)
// -------------------------------------------------------------
 supabase.auth.onAuthStateChange((event, session) => {
    const isLoginPage = window.location.pathname.includes("index.html");

    // If no active session and not on login page → redirect
    if (!session && !isLoginPage) {
        console.warn("⛔ Session missing – redirecting to login.");
        window.location.href = "index.html";
    }
});

// -------------------------------------------------------------
// LOGOUT BUTTON
// -------------------------------------------------------------

const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        alert("Failed to log out.");
        return;
      }

      // Clear any cached session data (belt + braces)
      localStorage.removeItem("supabase.auth.token");

      // Redirect to login
      window.location.href = "index.html";

    } catch (err) {
      console.error("Unexpected logout failure:", err);
      window.location.href = "index.html";
    }
  });
}




// -------------------------------------------------------------
// 🚀 Load header + bind logout button + lucide icon render
// -------------------------------------------------------------

//async function loadHeader() {

    // 1️⃣ Declare path first
//    const path = window.location.pathname;

//    const headerContainer = document.getElementById("header-container");

//    if (!headerContainer) {
//        console.warn("Header container not found.");
//        return;
//    }

    // 2️⃣ Inject header
//    const headerHtml = await fetch("/header.html").then(res => res.text());
//    headerContainer.innerHTML = headerHtml;

    // Wait one render frame so injected DOM exists
//    await new Promise(requestAnimationFrame);

    // 3️⃣ Render icons
//    if (window.lucide) {
//        window.lucide.createIcons();
//    }

    // 4️⃣ Banner logic
//    const banner = document.getElementById("country-banner");
//    if (!banner) {
//        console.warn("Banner element missing.");
//        return;
//    }

//    const isIndexPage =
//        path === "/" ||
//        path === "/index.html" ||
//        path.endsWith("/index.html") ||
//        path.endsWith("/");

//    const isCountryPage    = path.includes("country.html");
//    const isEditionPage    = path.includes("edition.html");
//    const isWinnersPage    = path.includes("winners.html");
//    const isFavoritesPage  = path.includes("my-favorites.html");
//    const isFanFavesPage   = path.includes("fan-favorites.html");
//    const isScoreboardPage = path.includes("scoreboard.html");
//    const isWatchHistoryPage = path.includes("my-stats.html");

//    const country = new URLSearchParams(window.location.search).get("country");

//    if (isIndexPage) {
//        banner.src = "/banners/douzepoints.png";
//        banner.alt = "Home";

//    } else if (isWinnersPage) {
//        banner.src = "/banners/winners.png";

//    } else if (isFanFavesPage) {
//        banner.src = "/banners/fanfavorites.png";

//    } else if (isFavoritesPage) {
//        banner.src = "/banners/my-faves.png";

//    } else if (isEditionPage) {
//        const editionYear = new URLSearchParams(window.location.search).get("edition");
//        if (editionYear) {
//            banner.src = `/banners/${editionYear}.png`;
//        }

//    } else if (isCountryPage && country) {
//        const { data } = await supabase
//            .from("douzepoints")
//            .select("Country_Code")
//            .ilike("Country", country)
//            .limit(1);

//        const code = data?.[0]?.Country_Code?.toLowerCase();
//        if (code) {
//            banner.src = `/banners/${code}.png`;
//        }

//    } else if (isWatchHistoryPage) {
//        banner.src = "/banners/watchstats.png";

//    } else if (isScoreboardPage) {
//        banner.src = "/banners/scoreboard.png";
//    }
//}

async function loadHeader() {

    const path = window.location.pathname;
    const headerContainer = document.getElementById("header-container");

    if (!headerContainer) return;

    const headerHtml = await fetch("header.html").then(res => res.text());
    headerContainer.innerHTML = headerHtml;

    await new Promise(requestAnimationFrame);

    // ⭐ ADD THIS — logout binding
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            await supabase.auth.signOut();
            window.location.href = "index.html";
        });
    }

    // Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Banner logic (UNCHANGED)
    const banner = document.getElementById("country-banner");
    if (!banner) return;

    const isIndexPage =
        path === "/" ||
        path === "/index.html" ||
        path.endsWith("/index.html") ||
        path.endsWith("/");

    const isCountryPage    = path.includes("country.html");
    const isEditionPage    = path.includes("edition.html");
    const isWinnersPage    = path.includes("winners.html");
    const isFavoritesPage  = path.includes("my-favorites.html");
    const isFanFavesPage   = path.includes("fan-favorites.html");
    const isScoreboardPage = path.includes("scoreboard.html");
    const isWatchHistoryPage = path.includes("my-stats.html");

    const country = new URLSearchParams(window.location.search).get("country");

    if (isIndexPage) {
        banner.src = "/banners/douzepoints.png";

    } else if (isWinnersPage) {
        banner.src = "/banners/winners.png";

    } else if (isFanFavesPage) {
        banner.src = "/banners/fanfavorites.png";

    } else if (isFavoritesPage) {
        banner.src = "/banners/my-faves.png";

    } else if (isEditionPage) {
        const editionYear = new URLSearchParams(window.location.search).get("edition");
        if (editionYear) {
            banner.src = `/banners/${editionYear}.png`;
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
        }

    } else if (isWatchHistoryPage) {
        banner.src = "/banners/watchstats.png";

    } else if (isScoreboardPage) {
        banner.src = "/banners/scoreboard.png";
    }
}
