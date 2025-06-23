document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

async function loadHeader() {
    const path = window.location.pathname;
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");
    headerContainer.innerHTML = headerHtml;

    const banner = document.getElementById("country-banner");

    const isCountryPage = path.includes("country.html");
    const isEditionPage = path.includes("edition.html");
    const isWinnersPage = path.includes("winners.html");
    const isFavouritesPage = path.includes("fan-favorites.html");
    const isAboutPage = path.includes("about.html");
    

    if (isWinnersPage && banner) {
        banner.src = "/banners/winners.png";
        banner.alt = "Winners";
    } else if (isFavouritesPage && banner) {
        banner.src = "/banners/fanfavorites.png";
        banner.alt = "Fan Favourites";
    } else if (isEditionPage && banner) {
        const year = new URLSearchParams(window.location.search).get("edition");
        if (year) {
            banner.src = `/banners/${year}.png`;
            banner.alt = `Edition ${year}`;
        }
    } else if (isCountryPage && banner) {
        const country = new URLSearchParams(window.location.search).get("country");
        if (!country) return;
        
        banner.src = `/banners/${country.toLowerCase().replace(/ /g, "-")}.png`;
        banner.alt = country;
    } else if (isAboutPage && banner) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "About";
