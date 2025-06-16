//(function() {
//  fetch('sidebar_countries.html')
//    .then(response => {
//      if (!response.ok) throw new Error('Sidebar could not be loaded.');
//      return response.text();
//    })
//    .then(data => {
//      document.getElementById('sidebar-container').innerHTML = data;
//    })
//    .catch(err => console.error('Error loading sidebar:', err));
//})();




document.addEventListener("DOMContentLoaded", () => {
    loadSidebarCountries();
});

async function loadSidebarCountries() {
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
            const countries = [...new Set(data.map(row => row.Country).filter(Boolean))].sort();

            const sidebar = document.getElementById("sidebar-container");

            countries.forEach(country => {
                const firstEntry = data.find(row => row.Country === country);
                const countryCode = firstEntry.Country_Code.toLowerCase();

                const div = document.createElement("div");
                div.className = "sidebar-row";

                const a = document.createElement("a");
                a.href = `country.html?country=${encodeURIComponent(country)}`;
                a.innerHTML = `<img class="flag-icon" src="flags/${countryCode}.png" alt="${country}">${country}`;

                div.appendChild(a);
                sidebar.appendChild(div);
            });
        }
    });
}
