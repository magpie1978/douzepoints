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
                const div = document.createElement("div");
                div.className = "sidebar-row";

                const a = document.createElement("a");
                a.href = `edition.html?edition=${year}`;
                a.textContent = year;

                div.appendChild(a);
                sidebar.appendChild(div);
            });
        }
    });
}
