// js/header_new.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

async function loadHeader() {

  const path = window.location.pathname;
  const headerContainer = document.getElementById("header-container");
  if (!headerContainer) return;

  const res = await fetch("header.html", { cache: "no-store" });
  if (!res.ok) {
    console.error("[header] Failed to load header.html:", res.status, res.statusText);
    return;
  }

  headerContainer.innerHTML = await res.text();
  await new Promise(requestAnimationFrame);

  if (window.lucide) window.lucide.createIcons();

  // --- session-aware header controls ---
  const { data: { session } } = await supabase.auth.getSession();

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {

    const hideLogoutPages = [
      "about.html",
      "contact.html",
      "faq.html",
      "privacy.html"
    ];

    const isStaticPage = hideLogoutPages.some(page =>
      path.endsWith(page)
    );

    if (isStaticPage) {
      logoutBtn.style.display = "none";
    } else {
      logoutBtn.style.display = session ? "flex" : "none";
    }

    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await supabase.auth.signOut();
      } finally {
        window.location.href = "index.html";
      }
    });
  }

}

  // --- Gate only "My Favorites" ---
  const favLink = headerContainer.querySelector('a[href="my-favorites.html"]');
  if (favLink) {
    favLink.addEventListener("click", async (e) => {
      e.preventDefault();

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = "my-favorites.html";
        return;
      }

      // If auth modal exists on this page, use it
      const hasModal = !!document.getElementById("auth-overlay");
      if (hasModal) {
        const { requireAuth } = await import("./auth.js");
        const ok = await requireAuth("my-favorites.html");
        if (ok) window.location.href = "my-favorites.html";
      } else {
        // Otherwise, send them to index where the auth modal lives
        window.location.href = "index.html?auth=1&next=my-favorites.html";
      }
    });
  }

  // --- Banner logic (unchanged, but keep paths relative) ---
  const banner = document.getElementById("country-banner");
  if (!banner) return;

  const isIndexPage =
    path === "/" ||
    path === "/index.html" ||
    path.endsWith("/index.html") ||
    path.endsWith("/");

  const isCountryPage      = path.includes("country.html");
  const isEditionPage      = path.includes("edition.html");
  const isWinnersPage      = path.includes("winners.html");
  const isFavoritesPage    = path.includes("my-favorites.html");
  const isFanFavesPage     = path.includes("fan-favorites.html");
  const isScoreboardPage   = path.includes("scoreboard.html");
  const isWatchHistoryPage = path.includes("my-stats.html");

  const country = new URLSearchParams(window.location.search).get("country");

  if (isIndexPage) {
    banner.src = "banners/douzepoints.png";
  } else if (isWinnersPage) {
    banner.src = "banners/winners.png";
  } else if (isFanFavesPage) {
    banner.src = "banners/fanfavorites.png";
  } else if (isFavoritesPage) {
    banner.src = "banners/my-faves.png";
  } else if (isEditionPage) {
    const editionYear = new URLSearchParams(window.location.search).get("edition");
    if (editionYear) banner.src = `banners/${editionYear}.png`;
  } else if (isCountryPage && country) {
    const { data } = await supabase
      .from("douzepoints")
      .select("Country_Code")
      .ilike("Country", country)
      .limit(1);

    const code = data?.[0]?.Country_Code?.toLowerCase();
    if (code) banner.src = `banners/${code}.png`;
  } else if (isWatchHistoryPage) {
    banner.src = "banners/watchstats.png";
  } else if (isScoreboardPage) {
    banner.src = "banners/scoreboard.png";
  }
}
