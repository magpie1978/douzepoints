document.addEventListener("DOMContentLoaded", async () => {
  console.log("sidebar.js loaded. Path:", window.location.pathname);
  const sidebarContainer = document.getElementById("sidebar-container");
  const supabase = window.supabase;

  if (!supabase?.from) {
    console.error("❌ Supabase not initialized or .from not available.");
    return;
  }

  const { data, error } = await supabase
    .from('douzepoints')
    .select('Country, Country_Code')
    .order('Country', { ascending: true });

  if (error || !data) {
    sidebarContainer.innerHTML = "<p style='padding: 10px;'>Failed to load countries.</p>";
    console.error("Sidebar load error:", error);
    return;
  }

  const uniqueCountries = Array.from(
    new Map(data.map(item => [item.Country, item])).values()
  );

  sidebarContainer.innerHTML = uniqueCountries
    .map(row => {
      const code = row.Country_Code?.toLowerCase();
      return `
        <div class="sidebar-item">
          <a href="supabase_country.html?country=${row.Country}">
            <img src="/flags/${code}.png" alt="${row.Country}" class="sidebar-flag" />
            <span class="sidebar-country">${row.Country}</span>
          </a>
        </div>
      `;
    })
    .join("");
});