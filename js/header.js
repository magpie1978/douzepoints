import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

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

    //const isIndexPage = path.endsWith("/") || path.includes("index.html");
    const isIndexPage = path === "/" || path.endsWith("index.html");
    const country = new URLSearchParams(window.location.search).get("country");
    const isCountryPage = path.includes("country.html");
    const isEditionPage = path.includes("edition.html");
    const isWinnersPage = path.includes("winners.html");
    const isFavouritesPage = path.includes("fan-favorites.html");
    const isAboutPage = path.includes("about.html");
    const isContactPage = path.includes("contact.html");
    const isFAQPage = path.includes("faq.html");
    const isPrivacyPage = path.includes("privacy.html");
    const isScoreboardPage = path.includes("scoreboard.html");
    const isMyFavesPage = path.includes("my-favorites.html");
    const isMyStatsPage = path.includes("my-stats.html");
    

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
            const { data, error } = await supabase
                .from("douzepoints")
                .select("LocationCountry")
                .eq("Year", editionYear)
                .limit(1);

            const locationCode = data?.[0]?.LocationCountry?.toLowerCase();
            if (locationCode) {
                banner.src = `/banners/${editionYear}.png`;
                banner.alt = editionYear;
            }
        }
    } else if (isCountryPage && country) {
        const { data, error } = await supabase
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
        } else {
            console.warn("⚠️ No country code found for:", country);
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
    } else if (isMyFavesPage) {
        banner.src = "/banners/my-faves.png";
        banner.alt = "My Favorites";
    } else if (isMyStatsPage) {
        banner.src = "/banners/my-stats.png";
        banner.alt = "My Stats";
    }
}
