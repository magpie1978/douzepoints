// Extracts the country parameter from the URL
const countryParam = new URLSearchParams(window.location.search).get("country");


// Waits until the HTML document is fully loaded, then calls the loadCountryData() function.
// This ensures that DOM elements like #video-container exist before the script tries to use them.
document.addEventListener("DOMContentLoaded", () => {
    loadCountryData();
});

// Load data from DouzePoints.csv using 'fetch' API
async function loadCountryData() {
    const csvUrl = "./data/DouzePoints.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    // Converts the CSV text into a structured JavaScript object (results.data is an array of row objects).
    Papa.parse(csvText, {
        header: true, // Uses the first row of the CSV as column names
        skipEmptyLines: true, // ignores blank lines
        transformHeader: h => h.trim(), // trims whitespace from headers and values
        transform: v => v.trim(),
        complete: function(results) {
            const isWinnersPage = window.location.pathname.includes("winners.html");

            // filters the data to only include rows for the selected country
            let data = results.data.filter(row => row.Country === countryParam);

            // further filters results to only include winning entries if the page is winners.html
            if (isWinnersPage) {
                data = data.filter(row => row.FinalResult === "1");
            }

            // guard clause: if no data found, log a warning and exit
            if (data.length === 0) {
                console.warn("No data found for:", countryParam);
                return;
            }

            // sorts entries so the most recent year appears first
            data.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));

            // clears the container where video items will be placed
            const container = document.getElementById("video-container");
            container.innerHTML = '';

            // creates a .video-item <div> for each entry and appends it to the container
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
                            <b>${row.Artist}</b><br>${row.Song}<br>${row.Year}
                        </div>
                    </div>
                `;
                div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
                container.appendChild(div);
            });

            // if the sorting <select> is present, this: 
            const sortSelect = document.getElementById("sort-options");
                if (sortSelect) {
                    sortSelect.value = "year-desc";  // sets its value to year-desc by default
                    attachSorting();  // calls a function attachSorting() (assumed to bind sorting logic)
                    sortSelect.dispatchEvent(new Event("change"));  // triggers the change event to apply the default sort
                }
        }
    });
}
