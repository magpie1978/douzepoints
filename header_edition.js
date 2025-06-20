document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

async function loadHeader() {
    const yearParam = new URLSearchParams(window.location.search).get("year");
    if (!yearParam) return;

    // Load the base header HTML
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");
    headerContainer.innerHTML = headerHtml;

    // Now update the banner image
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            const data = results.data;
            const firstEntry = data.find(row => row.Year === yearParam);
            if (!firstEntry) return;

            //const countryCode = firstEntry.Country_Code.toLowerCase();
            const bannerImage = `banners/${yearParam}.png`;

            const banner = document.getElementById("country-banner");
            if (banner) {
                banner.src = bannerImage;
                banner.alt = yearParam;
            }
        }
    });
}
