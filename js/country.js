const countryParam = new URLSearchParams(window.location.search).get("country");

document.addEventListener("DOMContentLoaded", () => {
    setBodyCountryCode();
    loadCountryData();
});

async function setBodyCountryCode() {
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
            if (firstEntry) {
                document.body.setAttribute("data-country", firstEntry.Country_Code.toLowerCase());
            }
        }
    });
}

async function loadCountryData() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            const data = results.data.filter(row => row.Country === countryParam);
            const countryCode = data[0]?.Country_Code?.toLowerCase();

            data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                const div = document.createElement("div");
                div.className = "video-item";
                div.setAttribute("data-year", row.Year);
                div.setAttribute("data-artist", row.Artist);
                div.setAttribute("data-song", row.Song);

                div.innerHTML = `
                    <div class="preview-container">
                        <img src="images/${row.Year}-${countryCode.toUpperCase()}.jpeg" alt="${row.Artist}"/>
                    </div>
                    <div class="video-title-with-icon" onclick="event.stopPropagation()">
                        <a href="country.html?country=${countryParam}">
                            <img class="flag-icon" src="flags/${countryCode}.png" alt="Flag">
                        </a>
                        <div class="video-title-text">
                            <b>${row.Artist}</b><br>${row.Song}<br>${row.Year}
                        </div>
                    </div>
                `;
                div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
                container.appendChild(div);
            });

            attachSorting();
        }
    });
}

function attachSorting() {
    const select = document.getElementById("sort-options");
    select.addEventListener("change", function () {
        const sortType = select.value;
        const container = document.getElementById("video-container");
        const items = Array.from(container.children);

        if (sortType === "year-desc") {
            items.sort((a, b) => parseInt(b.dataset.year) - parseInt(a.dataset.year));
        } else if (sortType === "year-asc") {
            items.sort((a, b) => parseInt(a.dataset.year) - parseInt(b.dataset.year));
        } else if (sortType === "artist") {
            items.sort((a, b) => a.dataset.artist.localeCompare(b.dataset.artist));
        } else if (sortType === "song") {
            items.sort((a, b) => a.dataset.song.localeCompare(b.dataset.song));
        }

        container.innerHTML = '';
        items.forEach(item => container.appendChild(item));
    });
}
