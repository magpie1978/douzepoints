// extracts the edition parameter from the page URL
const editionParam = new URLSearchParams(window.location.search).get("edition");

// waits for the HTML document to be fully loaded before running any JavaScript logic
// ensures the DOM is ready before calling loadEditionData()
document.addEventListener("DOMContentLoaded", () => {
    loadEditionData();
});

// fetches, parses, filters, and injects the correct edition's video data into the page
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
            const data = results.data.filter(row => row.Year === editionParam); // only includes rows where the Year matches the selected edition
            
            // if no matching rows are found, a warning is logged and nothing is rendered
            if (data.length === 0) {
                console.warn("No entries found for edition:", editionParam);
                return;
            }

            // clears the existing contents of the video container.
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
                div.setAttribute("data-country", row.Country); // required for sorting

                div.innerHTML = `
                    <div class="preview-container">
                        <img src="images/${row.Year}-${countryCode.toUpperCase()}.jpeg" alt="${row.Artist}"/>
                    </div>
                    <div class="video-title-with-icon" onclick="event.stopPropagation()">
                        <a href="country.html?country=${row.Country}">
                            <img class="flag-icon" src="/flags/${countryCode}.png" alt="Flag">
                        </a>
                        <div class="video-title-text">
                            <b>${row.Artist}</b><br>${row.Song}<br>${row.Country}
                        </div>
                    </div>
                `;
                div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
                container.appendChild(div);
            });

            // ensure sorting is attached AFTER items are in the DOM
            attachSorting();

            // ✅ Now trigger default sort manually
            const select = document.getElementById("sort-options");
            select.value = "country"; // default sort is set to "country" (i.e., alphabetical by country).
            const event = new Event("change"); // triggers the change event to apply the default sort
            select.dispatchEvent(event);
        }
    });
}
