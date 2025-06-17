document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

async function loadHeader() {
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
        complete: function(results) {
            const data = results.data;
            const firstEntry = data.find(row => row.Country === countryParam);
            if (!firstEntry) return;

            const countryCode = firstEntry.Country_Code.toLowerCase();
            const bannerImage = `banners/${countryCode}.png`;

            const headerContainer = document.getElementById("header-container");
            headerContainer.innerHTML = `
                <div class="banner-static">
                    <img src="${bannerImage}" alt="${countryParam}">
                </div>`;
        }
    });
}
