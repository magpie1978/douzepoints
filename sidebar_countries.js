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
            const countries = [...new Set(data.map(row => row.Country).filter(Boolean))].sort();
            const sidebar = document.getElementById("sidebar-container");

            countries.forEach(country => {
                const countryCode = data.find(row => row.Country === country).Country_Code.toLowerCase();
                const link = document.createElement("a");
                link.href = `country.html?country=${encodeURIComponent(country)}`;
                link.innerHTML = `<img src="flags/${countryCode}.png" class="flag-icon" /> ${country}`;
                sidebar.appendChild(link);
            });
        }
    });
}

loadSidebarCountries();
