document.addEventListener("DOMContentLoaded", () => {
    loadSidebarYears();
});

async function loadSidebarYears() {
    try {
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

                if (!data || data.length === 0) {
                    console.warn("No data found in CSV.");
                    return;
                }

                // Extract and sort years descending
                const years = [...new Set(data.map(row => row.Year).filter(Boolean))].sort((a, b) => b - a);

                if (years.length === 0) {
                    console.warn("No valid years found in CSV.");
                    return;
                }

                const sidebar = document.getElementById("sidebar-container");
                if (!sidebar) {
                    console.error("#sidebar-container not found.");
                    return;
                }

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
    } catch (err) {
        console.error("Error loading sidebar years:", err);
    }
}
