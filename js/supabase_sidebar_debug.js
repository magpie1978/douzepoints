document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;
  console.log("sidebar.js loaded. Path:", path);

  const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';

  const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (!supabase) {
    console.error("Supabase client not initialized.");
    const sidebar = document.getElementById("sidebar-container");
    if (sidebar) sidebar.innerHTML = "<p style='color: red;'>Supabase not initialized</p>";
    return;
  }

  if (
    path.includes("supabase_country.html") ||
    path.includes("supabase_winners.html") ||
    path.includes("supabase_fan-favorites.html")
  ) {
    console.log("Calling loadSidebarCountries()");
    await loadSidebarCountries();
  } else if (
    path.includes("supabase_edition.html")
  ) {
    console.log("Calling loadSidebarYears()");
    await loadSidebarYears();
  }

  async function loadSidebarCountries() {
    const sidebar = document.getElementById("sidebar-container");
    if (!sidebar) return;

    try {
      const { data, error } = await supabase.from('douzepoints').select('*');
      console.log("Sidebar Countries Data:", data);
      console.log("Sidebar Countries Error:", error);
      if (error) throw error;

      //sidebar.innerHTML = `<p style='color:white'>Loaded ${data.length} rows for countries</p>`;

      const uniqueCountries = Array.from(
        new Map(data.map(row => [row.Country, row])).values()
      ).sort((a, b) => a.Country.localeCompare(b.Country));

      uniqueCountries.forEach(entry => {
        const country = entry.Country;
        const countryCode = entry.Country_Code?.toLowerCase() || 'xx';

        const div = document.createElement("div");
        div.className = "sidebar-row";

        const a = document.createElement("a");
        a.href = `supabase_country.html?country=${encodeURIComponent(country)}`;

        const img = document.createElement("img");
        img.src = `flags/${countryCode}.png`;
        img.alt = country;
        img.className = "flag-icon";

        a.appendChild(img);
        a.appendChild(document.createTextNode(country));
        div.appendChild(a);
        sidebar.appendChild(div);
      });
    } catch (err) {
      console.error("SidebarCountries FAILED:", err.message);
      sidebar.innerHTML = `<p style='color: red;'>SidebarCountries FAILED: ${err.message}</p>`;
    }
  }

  async function loadSidebarYears() {
    const sidebar = document.getElementById("sidebar-container");
    if (!sidebar) return;

    try {
      const { data, error } = await supabase.from('douzepoints').select('*');
      console.log("Sidebar Years Data:", data);
      console.log("Sidebar Years Error:", error);
      if (error) throw error;

      
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
        a.href = `supabase_edition.html?edition=${year}`;
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
    } catch (err) {
      console.error("SidebarYears FAILED:", err.message);
      sidebar.innerHTML = `<p style='color: red;'>SidebarYears FAILED: ${err.message}</p>`;
    }
  }
});
