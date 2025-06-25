document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

if (path.includes("country.html") || path.includes("winners.html")) {
  loadSidebarCountries();
} else if (path.includes("edition.html")) {
  loadSidebarYears();
}

  
async function fetchCSVData() {
  const csvUrl = "./data/DouzePoints.csv";
  const response = await fetch(csvUrl);
  const csvText = await response.text();

  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => v.trim(),
      complete: results => resolve(results.data)
    });
  });
}

async function loadSidebarCountries() {
  const data = await fetchCSVData();

  const countries = [...new Set(data.map(row => row.Country).filter(Boolean))].sort();
  const sidebar = document.getElementById("sidebar-container");

  countries.forEach(country => {
    const firstEntry = data.find(row => row.Country === country);
    const countryCode = firstEntry.Country_Code.toLowerCase();

    const div = document.createElement("div");
    div.className = "sidebar-row";

    const a = document.createElement("a");
    a.href = `country.html?country=${encodeURIComponent(country)}`;

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

  const years = [...new Set(data.map(row => row.Year).filter(Boolean))].sort((a, b) => b - a);
  const sidebar = document.getElementById("sidebar-container");

  years.forEach(year => {
    const hostEntry = data.find(row => row.Year === year && row.Location && row.LocationCountry);
    const hostCountryCode = hostEntry?.LocationCountry?.toLowerCase() || 'eu';
    const hostLocation = hostEntry?.Location || 'Unknown';

    const div = document.createElement("div");
    div.className = "sidebar-row";

    const a = document.createElement("a");
    a.href = `edition.html?edition=${year}`;
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
