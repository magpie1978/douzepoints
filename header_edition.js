document.addEventListener("DOMContentLoaded", () => {
    loadEditionHeader();
});

async function loadEditionHeader() {
    const editionParam = new URLSearchParams(window.location.search).get("edition");
    if (!editionParam) return;

    // Load base header HTML
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");
    headerContainer.innerHTML = headerHtml;

    // Then inject the banner image based on LocationCountry
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
            const match = data.find(row => row.Year === editionParam);
            if (!match) return;

            const code = match.LocationCountry?.toLowerCase() || 'eu';
            const bannerImg = document.getElementById("country-banner");
            if (bannerImg) {
                bannerImg.src = `/banners/${code}.png`;
                bannerImg.alt = match.Location || editionParam;
            }
        }
    });
}
