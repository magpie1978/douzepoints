document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

async function loadHeader() {
    const path = window.location.pathname;
    const isWinnersPage = path.includes("winners.html");
    const isFavouritesPage = path.includes("fan-favourites.html");

if (isWinnersPage) {
    banner.src = "/banners/winners.png";
    banner.alt = "Winners";
} else if (isFavouritesPage) {
    banner.src = "/banners/fanfavourites.png";
    banner.alt = "Fan Favourites";
}

    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");
    headerContainer.innerHTML = headerHtml;

    if (isWinnersPage) {
        const banner = document.getElementById("country-banner");
        if (banner) {
            banner.src = "/banners/winners.png";
            banner.alt = "Winners";
        }
    } else {
        const countryParam = new URLSearchParams(window.location.search).get("country");
        if (!countryParam) return;

        const csvUrl = "./data/DouzePoints.csv";
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: h => h.trim(),
            transform: v => v.trim(),
            complete: function (results) {
                const data = results.data;
                const firstEntry = data.find(row => row.Country === countryParam);
                if (!firstEntry) return;

                const countryCode = firstEntry.Country_Code.toLowerCase();
                const banner = document.getElementById("country-banner");
                if (banner) {
                    banner.src = `/banners/${countryCode}.png`;
                    banner.alt = countryParam;
                }
            }
        });
    }
}
