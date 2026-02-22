// js/header_new.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

async function loadHeader() {
  const path = window.location.pathname;
  const headerContainer = document.getElementById("header-container");
  if (!headerContainer) return;

  // ✅ IMPORTANT: relative path (works on douzepoints.org + GitHub Pages)
  const res = await fetch("header.html", { cache: "no-store" });
  if (!res.ok) {
    console.error("[header] Failed to load header.html:", res.status, res.statusText);
    return;
  }

  headerContainer.innerHTML = await res.text();
  await new Promise(requestAnimationFrame);

  // ✅ Render Lucide icons (your header.html uses data-lucide)
  if (window.lucide) window.lucide.createIcons();

  // ✅ Logout (no login.html anymore)
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await supabase.auth.signOut();
      } finally {
        window.location.href = "index.html";
      }
    });
  }

  // ✅ Gate only My Favorites (dynamic import is valid inside function)
  const favLink = headerContainer.querySelector('a[href="my-favorites.html"]');
  if (favLink) {
    favLink.addEventListener("click", async (e) => {
      e.preventDefault();
      const { requireAuth } = await import("./auth.js");
      const ok = await requireAuth("my-favorites.html");
      if (ok) window.location.href = "my-favorites.html";
    });
  }

  // ✅ Banner logic (keep yours, but use RELATIVE banner paths)
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
