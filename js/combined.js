const urlParams = new URLSearchParams(window.location.search);
const editionParam = urlParams.get("edition");
const countryParam = urlParams.get("country");

document.addEventListener("DOMContentLoaded", () => {
    const pathname = window.location.pathname;

    if (pathname.includes("edition.html") && editionParam) {
        loadEditionData();
    } else if ((pathname.includes("country.html") || pathname.includes("winners.html")) && countryParam) {
        loadCountryData();
    }
});

// EDITION LOGIC
async function loadEditionData() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        transform: v => v.trim(),
        complete: function(results) {
            const data = results.data.filter(row => row.Year === editionParam);
            if (data.length === 0) {
                console.warn("No entries found for edition:", editionParam);
                return;
            }

            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                container.appendChild(buildVideoItem(row));
            });

            attachSorting();
            const select = document.getElementById("sort-options");
            if (select) {
                select.value = "country";
                select.dispatchEvent(new Event("change"));
            }
        }
    });
}

// COUNTRY / WINNERS LOGIC
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
            const isWinnersPage = window.location.pathname.includes("winners.html");

            let data = results.data.filter(row => row.Country === countryParam);
            if (isWinnersPage) {
                data = data.filter(row => row.FinalResult === "1");
            }

            if (data.length === 0) {
                console.warn("No data found for:", countryParam);
                return;
            }

            data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

            const container = document.getElementById("video-container");
            container.innerHTML = '';

            data.forEach(row => {
                container.appendChild(buildVideoItem(row));
            });

            const sortSelect = document.getElementById("sort-options");
            if (sortSelect) {
                sortSelect.value = "year-desc";
                attachSorting();
                sortSelect.dispatchEvent(new Event("change"));
            }
        }
    });
}

// SHARED FUNCTION
function buildVideoItem(row) {
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
                <b>${row.Artist}</b><br>${row.Song}<br>${row.Year || row.Country}
            </div>
        </div>
    `;
    div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
    return div;
}
