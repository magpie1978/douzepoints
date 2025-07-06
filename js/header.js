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

    const isIndexPage = path === '/' || path.includes('index.html');
    const isCountryPage = path.includes("country.html");
    const isEditionPage = path.includes("edition");
    const isWinnersPage = path.includes("winners.html");
    const isFavouritesPage = path.includes("fan-favorites.html");
    const isAboutPage = path.includes("about.html");
    const isContactPage = path.includes("contact.html");
    const isFAQPage = path.includes("faq.html");
    const isPrivacyPage = path.includes("privacy.html");
    const isScoreboardPage = path.includes("scoreboard");

    if (isIndexPage && banner) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "DouzePoints";
    } else if (isWinnersPage && banner) {
        banner.src = "/banners/winners.png";
        banner.alt = "Winners";
    } else if (isFavouritesPage && banner) {
        banner.src = "/banners/fanfavorites.png";
        banner.alt = "Fan Favourites";
    } else if (isScoreboardPage && banner) {
        banner.src = "/banners/scoreboard.png";
        banner.alt = "Scoreboard";
    } else if (isEditionPage && banner) {
        const year = new URLSearchParams(window.location.search).get("edition");
        if (year) {
            banner.src = `/banners/${year}.png`;
            banner.alt = `Edition ${year}`;
        }
    } else if (isCountryPage && banner) {
        const country = new URLSearchParams(window.location.search).get("country");
        if (!country) return;

        document.body.setAttribute("data-country", country);

        const csvUrl = "./data/DouzePoints.csv";
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: h => h.trim(),
            transform: v => v.trim(),
            complete: function(results) {
                const match = results.data.find(row => row.Country === country);
                if (match && match.Country_Code) {
                    const code = match.Country_Code.toLowerCase();
                    const bannerPath = `/banners/${code}.png`;
                    banner.src = bannerPath;
                    banner.alt = country;
                    console.log("Country banner set:", bannerPath);
                } else {
                    console.warn("No matching country code for:", country);
                }
            }
        });
    } else if (isAboutPage && banner) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "About";
    } else if (isContactPage && banner) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "Contact";
    } else if (isFAQPage && banner) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "FAQ";
    } else if (isPrivacyPage && banner) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "Privacy";
    } // ← MISSING BRACE FIXED HERE
} // ← FINAL CLOSING BRACE FOR loadHeader FUNCTION
