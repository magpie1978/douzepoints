document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

async function loadHeader() {
  try {
    const headerHtml = await fetch("supabase_header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;
    headerContainer.innerHTML = headerHtml;

    const banner = document.getElementById("country-banner");
    if (!banner) return;

    const path = window.location.pathname;

    const isCountryPage = path.includes("country.html");
    const isEditionPage = path.includes("edition.html");
    const isWinnersPage = path.includes("winners.html");
    const isFanFavoritesPage = path.includes("fan-favorites.html");

    if (isWinnersPage) {
      banner.src = "/banners/winners.png";
      banner.alt = "Winners";
    } else if (isCountryPage) {
      const country = new URLSearchParams(window.location.search).get("country");
      if (country) {
        banner.src = `/banners/${country.slice(0, 2).toLowerCase()}.png`;
        banner.alt = country;
      }
    } else if (isEditionPage) {
      const edition = new URLSearchParams(window.location.search).get("edition");
      if (edition) {
        banner.src = `/banners/${edition}.png`;
        banner.alt = edition;
      }
    } else if (isFanFavoritesPage) {
      banner.src = "/banners/fanfavorites.png";
      banner.alt = "Fan Favourites";
    }
  } catch (err) {
    console.error("Header load error:", err);
  }
}
