document.addEventListener("DOMContentLoaded", () => {
    loadSidebarYears();
});

async function loadSidebarYears() {
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

            // Extract unique years and sort descending
            const years = [...new Set(data.map(row => row.Year).filter(Boolean))].sort((a, b) => b - a);

            const sidebar = document.getElementById("sidebar-container");

            years.forEach(year => {
                // Get Location for the year (assumes first row per year is valid)
                const hostEntry = data.find(row => row.Year === year && row.Location);
                const hostCountryCode = hostEntry?.Location?.toLowerCase() || 'eu';

                const div = document.createElement("div");
                div.className = "sidebar-row";

                const a = document.createElement("a");
                a.href = `edition.html?edition=${year}`;
                a.style.display = 'flex';
                a.style.alignItems = 'center';
                a.style.gap = '10px';

                const img = document.createElement("img");
                img.src = `flags/${hostCountryCode}.png`;
                img.alt = hostCountryCode.toUpperCase();
                img.className = "flag-icon";

                a.appendChild(img);
                a.appendChild(document.createTextNode(year));
                div.appendChild(a);
                sidebar.appendChild(div);
            });
        }
    });
}
