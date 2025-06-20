document.addEventListener("DOMContentLoaded", () => {
    loadSidebarEditions();
});

async function loadSidebarEditions() {
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

            // Extract unique countries
            const edition = [...new Set(data.map(row => row.Year).filter(Boolean))].sort();

            const sidebar = document.getElementById("sidebar-container");

            edition.forEach(Year => {
                const firstEntry = data.find(row => row.Year === Year);
                const countryCode = firstEntry.Country_Code.toLowerCase();

                const div = document.createElement("div");
                div.className = "sidebar-row";

                const a = document.createElement("a");
                a.href = `edition.html?year=${encodeURIComponent(Year)}`;

                // ✅ This is the critical fix: apply the flag-icon class here
                const img = document.createElement("img");
                img.src = `flags/${countryCode}.png`;
                img.alt = country;
                img.className = "flag-icon";

                a.appendChild(img);
                a.appendChild(document.createTextNode(country));

                div.appendChild(a);
                sidebar.appendChild(div);
            });
        }
    });
}
