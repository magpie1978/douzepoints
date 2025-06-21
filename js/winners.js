document.addEventListener("DOMContentLoaded", () => {
    loadWinnerEntries();
});

async function loadWinnerEntries() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            let data = results.data.filter(row =>
                row.FinalResult && row.FinalResult.trim().startsWith("1")
            );

            if (data.length === 0) {
                document.getElementById("video-container").innerHTML =
                    "<p style='padding: 20px; color: #ccc;'>No winners found.</p>";
                return;
            }

            data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                const countryCode = row.Country_Code?.toLowerCase();
                const div = document.createElement("div");
                div.className = "video-item";
                div.setAttribute("data-year", row.Year);
                div.setAttribute("data-artist", row.Artist);
                div.setAttribute("data-song", row.Song);
                div.setAttribute("data-country", row.Country);

                div.innerHTML = `
                    <div class="preview-container">
                        <img src="images/${row.Year}-${countryCode.toUpperCase()}.jpeg" alt="${row.Artist}"/>
                    </div>
                    <div class="video-title-with-icon" onclick="event.stopPropagation()">
                        <a href="country.html?country=${row.Country}">
                            <img class="flag-icon" src="/flags/${countryCode}.png" alt="Flag">
                        </a>
                        <div class="video-title-text">
                            <b>${row.Artist}</b><br>${row.Song}<br>${row.Country} ${row.Year}
                        </div>
                    </div>
                `;
                div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
                container.appendChild(div);
            });

            // Optional: enable default sorting (e.g. by country)
            const sortSelect = document.getElementById("sort-options");
            if (sortSelect) {
                sortSelect.value = "country";
                attachSorting();
                sortSelect.dispatchEvent(new Event("change"));
            }
        }
    });
}
