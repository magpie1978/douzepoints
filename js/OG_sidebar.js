document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  console.log("sidebar.js loaded. Path:", path);

if (path.includes("OG_country.html") || path.includes("OG_winners.html") || path.includes("OG_fan-favorites.html")) {
    console.log("Calling loadSidebarCountries()");
    loadSidebarCountries();
  } else if (path.includes("OG_edition.html")) {
    console.log("Calling loadSidebarYears()");
    loadSidebarYears();
  }

  async function fetchCSVData() {
    const csvUrl = "./data/DouzePoints.csv";
    console.log("Fetching CSV from:", csvUrl);

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error("Failed to load CSV");
      }
      const csvText = await response.text();
      console.log("CSV fetched successfully");

      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: h => h.trim(),
          transform: v => v.trim(),
          complete: results => {
            console.log("Parsed CSV data:", results.data.slice(0, 5)); // log a few rows
            resolve(results.data);
          }
        });
      });
    } catch (error) {
      console.error("CSV fetch error:", error);
      return [];
    }
  }

  async function loadSidebarCountries() {
    const data = await fetchCSVData();
    const sidebar = document.getElementById("sidebar-container");

    if (!sidebar) {
      console.warn("No #sidebar-container found in DOM");
      return;
    }

    const countries = [...new Set(data.map(row => row.Country).filter(Boolean))].sort();
    console.log("Unique countries:", countries);

    if (countries.length === 0) {
      sidebar.innerHTML = "<p style='color: #ccc'>No country data loaded.</p>";
      return;
    }

    countries.forEach(country => {
      const firstEntry = data.find(row => row.Country === country);
      const countryCode = firstEntry.Country_Code?.toLowerCase() || 'xx';

      const div = document.createElement("div");
      div.className = "sidebar-row";

      const a = document.createElement("a");
      a.href = `OG_country.html?country=${encodeURIComponent(country)}`;

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

  async function loadSidebarYears() {
    const data = await fetchCSVData();
    const sidebar = document.getElementById("sidebar-container");

    if (!sidebar) {
      console.warn("No #sidebar-container found in DOM");
      return;
    }

    const years = [...new Set(data.map(row => row.Year).filter(Boolean))].sort((a, b) => b - a);
    console.log("Unique years:", years);

    years.forEach(year => {
      const hostEntry = data.find(row => row.Year === year && row.Location && row.LocationCountry);
      const hostCountryCode = hostEntry?.LocationCountry?.toLowerCase() || 'eu';
      const hostLocation = hostEntry?.Location || 'Unknown';

      const div = document.createElement("div");
      div.className = "sidebar-row";

      const a = document.createElement("a");
      a.href = `OG_edition.html?edition=${year}`;
      a.style.display = 'flex';
      a.style.alignItems = 'center';
      a.style.gap = '10px';

      const img = document.createElement("img");
      img.src = `/flags/${hostCountryCode}.png`;
      img.alt = hostCountryCode.toUpperCase();
      img.className = "flag-icon";

      a.appendChild(img);
      a.appendChild(document.createTextNode(`${hostLocation} ${year}`));

      div.appendChild(a);
      sidebar.appendChild(div);
    });
  }
});
