import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;
  //console.log("sidebar.js loaded. Path:", path);

  if (
    path.includes("country.html") ||
    path.includes("winners.html") ||
    path.includes("fan-favorites.html")
//  ) {
//    console.log("Calling loadSidebarCountries()");
//    await loadSidebarCountries();
//  } else if (
    path.includes("edition.html")
    
//  ) {
//    console.log("Calling loadSidebarYears()");
//    await loadSidebarYears();
  }

  async function loadSidebarCountries() {
    const { data, error } = await supabase.from('douzepoints').select('*');
    const sidebar = document.getElementById("sidebar-container");
    if (!sidebar || error) return;

    const uniqueCountries = Array.from(
      new Map(data.map(row => [row.Country, row])).values()
    ).sort((a, b) => a.Country.localeCompare(b.Country));

    uniqueCountries.forEach(entry => {
      const country = entry.Country;
      const countryCode = entry.Country_Code?.toLowerCase() || 'xx';

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
    const { data, error } = await supabase.from('douzepoints').select('*');
    console.log("Sidebar Years Data:", data);
    console.log("Sidebar Error:", error);
    const sidebar = document.getElementById("sidebar-container");
    if (!sidebar || error) {
      console.warn("Sidebar or data error occurred");
      return;
    }

    const uniqueYears = Array.from(
      new Map(data.map(row => [row.Year, row])).values()
    ).sort((a, b) => b.Year - a.Year);

    uniqueYears.forEach(entry => {
      const year = entry.Year;
      const hostCountryCode = entry.LocationCountry?.toLowerCase() || 'eu';
      const hostLocation = entry.Location || 'Unknown';

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
});
