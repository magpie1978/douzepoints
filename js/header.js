// js/header_new.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});


async function loadHeader() {

  const path = window.location.pathname;
  const headerContainer = document.getElementById("header-container");
  if (!headerContainer) return;

  // --------------------------------------------------
  // Load shared header HTML
  // --------------------------------------------------
  const res = await fetch("header.html", { cache: "no-store" });
  if (!res.ok) {
    console.error("[header] Failed to load header.html:", res.status, res.statusText);
    return;
  }

  headerContainer.innerHTML = await res.text();
  await new Promise(requestAnimationFrame);

  if (window.lucide) window.lucide.createIcons();

  // --------------------------------------------------
  // Session-aware controls
  // --------------------------------------------------
  const { data: { session } } = await supabase.auth.getSession();

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {

    // Show logout only if logged in
    logoutBtn.style.display = session ? "flex" : "none";

    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await supabase.auth.signOut();
      } finally {
        window.location.href = "index.html";
      }
    });
  }

  // --------------------------------------------------
  // Gate only "My Favorites"
  // --------------------------------------------------
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
        window.location.href = "index.html?auth=1&next=my-favorites.html";
      }
    });
  }

  // --------------------------------------------------
  // Banner Logic (Flash-Free)
  // --------------------------------------------------
  const banner = document.getElementById("country-banner");
  if (!banner) return;

  // Hide by default (prevents broken image flash)
  banner.style.display = "none";

  const isIndexPage =
    path === "/" ||
    path.endsWith("/index.html") ||
    path.endsWith("/");

  const isCountryPage      = path.includes("country.html");
  const isEditionPage      = path.includes("edition.html");
  const isWinnersPage      = path.includes("winners.html");
  const isShowPage         = path.includes("shows.html");  
  const isFavoritesPage    = path.includes("my-favorites.html");
  const isFanFavesPage     = path.includes("fan-favorites.html");
  const isScoreboardPage   = path.includes("scoreboard.html");
  const isWatchHistoryPage = path.includes("my-stats.html");

  const country = new URLSearchParams(window.location.search).get("country");

  let bannerSrc = null;

  if (isIndexPage) {
    bannerSrc = "banners/douzepoints.png";
  } else if (isWinnersPage) {
    bannerSrc = "banners/winners.png";
  } else if (isFanFavesPage) {
    bannerSrc = "banners/fanfavorites.png";
  } else if (isShowPage) {
    bannerSrc = "banners/shows.png";
  } else if (isFavoritesPage) {
    bannerSrc = "banners/my-faves.png";
  } else if (isEditionPage) {
    const editionYear = new URLSearchParams(window.location.search).get("edition");
    if (editionYear) bannerSrc = `banners/${editionYear}.png`;
  } else if (isCountryPage && country) {
    const { data } = await supabase
      .from("douzepoints")
      .select("Country_Code")
      .ilike("Country", country)
      .limit(1);

    const code = data?.[0]?.Country_Code?.toLowerCase();
    if (code) bannerSrc = `banners/${code}.png`;
  } else if (isWatchHistoryPage) {
    bannerSrc = "banners/watchstats.png";
  } else if (isScoreboardPage) {
    bannerSrc = "banners/scoreboard.png";
  }

  if (bannerSrc) {
    banner.onload = () => {
      banner.style.display = "block";
    };
    banner.src = bannerSrc;
  }
}
