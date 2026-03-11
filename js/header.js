import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

async function loadHeader() {

  const path = window.location.pathname;
  const headerContainer = document.getElementById("header-container");
  if (!headerContainer) return;

  /* Load shared header HTML */

  const res = await fetch("header.html", { cache: "no-store" });

  if (!res.ok) {
    console.error("[header] Failed to load header.html:", res.status);
    return;
  }

  headerContainer.innerHTML = await res.text();

  await new Promise(requestAnimationFrame);

  if (window.lucide) window.lucide.createIcons();

  /* Load National Finals dropdown */

  await loadNationalFinalsMenu();

  /* Session-aware controls */

  const { data: { session } } = await supabase.auth.getSession();

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {

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

  /* Banner Logic */

  const banner = document.getElementById("country-banner");
  if (!banner) return;

  banner.style.display = "none";

  const params = new URLSearchParams(window.location.search);

  const country = params.get("country");
  const contest = params.get("contest");

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
  const isNationalPage     = path.includes("national-finals.html");

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

    const editionYear = params.get("edition");
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

  } else if (isNationalPage && contest) {

    bannerSrc = `/banners_nf/${contest}.png`;

  }

  if (bannerSrc) {

    banner.onload = () => {
      banner.style.display = "block";
    };

    banner.src = bannerSrc;

  }

}

/* National Finals dropdown */

async function loadNationalFinalsMenu() {

  const menu = document.getElementById("national-finals-dropdown");
  if (!menu) return;

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Contest, country");

  if (error) {
    console.error("[header] National Finals menu error:", error);
    return;
  }

  const contests = [
    ...new Map(data.map(r => [r.country, r])).values()
  ].sort((a,b)=>a.Contest.localeCompare(b.Contest));
  
  contests.forEach(row => {
  
    const li = document.createElement("li");
  
    const a = document.createElement("a");
    a.className = "dropdown-item";
  
    a.href = `national-finals.html?contest=${row.country}`;
    a.textContent = row.Contest;
  
    li.appendChild(a);
    menu.appendChild(li);
  
  });

}
