
document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;
  console.log("sidebar.js loaded. Path:", path);

  const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';

  const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const sidebar = document.getElementById("sidebar-container");
  if (!sidebar || !supabase) return;

  const page = path.split("/").pop();
  const isEditionPage = page.startsWith("edition");
  const isCountryPage = page.startsWith("country");
  const isWinnersPage = page.startsWith("winners");
  const isFavesPage = page.startsWith("fan-favorites");

  if (isCountryPage || isWinnersPage || isFavesPage) {
    await loadSidebarCountries();
  } else if (isEditionPage) {
    await loadSidebarYears();
  }

  async function loadSidebarCountries() {
    const { data, error } = await supabase.from('douzepoints').select('*');
    if (error || !data) {
      sidebar.innerHTML = `<p style='color: red;'>Error loading countries</p>`;
      return;
    }

    const countries = Array.from(new Map(data.map(d => [d.Country, d])).values())
      .sort((a, b) => a.Country.localeCompare(b.Country));

    countries.forEach(entry => {
      const countryCode = entry.Country_Code?.toLowerCase() || 'xx';
      const div = document.createElement("div");
      div.className = "sidebar-row";

      const a = document.createElement("a");
      a.href = `country.html?country=${encodeURIComponent(entry.Country)}`;

      const img = document.createElement("img");
      img.src = `flags/${countryCode}.png`;
      img.alt = entry.Country;
      img.className = "flag-icon";

      a.appendChild(img);
      a.appendChild(document.createTextNode(entry.Country));
      div.appendChild(a);
      sidebar.appendChild(div);
    });
  }

  async function loadSidebarYears() {
    const { data, error } = await supabase.from('douzepoints').select('*');
    if (error || !data) {
      sidebar.innerHTML = `<p style='color: red;'>Error loading years</p>`;
      console.error("Supabase error:", error);
      return;
    }

    const rawYears = data.map(row => row.Year);
    console.log("🎯 All raw Year values from Supabase:", rawYears);

    const entriesByYear = new Map();
    for (const entry of data) {
      const rawYear = entry.Year;
      const year = parseInt(rawYear, 10);
      if (isNaN(year)) continue;
      if (!entriesByYear.has(year)) {
        entriesByYear.set(year, entry);
      }
    }

    const sortedYears = Array.from(entriesByYear.keys()).sort((a, b) => b - a);

    sortedYears.forEach(year => {
      const entry = entriesByYear.get(year);
      const hostLocation = entry?.Location || 'Unknown';
      const hostCountryCode = entry?.LocationCountry?.toLowerCase() || 'eu';

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
