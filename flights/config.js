/* global mapboxgl, supabase */

const SUPABASE_URL = "https://jxmyetsjqkrluxqtevxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXlldHNqcWtybHV4cXRldnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzI2NjYsImV4cCI6MjA4MDYwODY2Nn0.YoXEtsY_Zh1Eeuj0kl11AOaj01VrZzGGKoPhJyQP-iU";

mapboxgl.accessToken ="pk.eyJ1IjoiY2hyaXMtZHVuaWdhbiIsImEiOiJjbWo4dDRtbGowM25lM2VzYWV0eHhocHp5In0.kO8gJyPmFLqQhz-kTTDyIQ";  /* Mapbox API token for rendering maps and vector tiles */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);  /* Creates a Supabase client instance used throughout the file for queries */

const MAX_ROUTES = 1000;  /* Safety cap to prevent rendering too many route geometries and killing performance */



// =====================================================
// INITIAl STARTUP
// =====================================================
map.on("load", async () => {
  hideSubCountryBorders();
  hideCityLabels();
  await loadFilters();
  await loadRoutes();
});

reloadBtn?.addEventListener("click", loadRoutes);

sidebarToggle?.addEventListener("click", () => {
  sidebar?.classList.toggle("collapsed");

  // if sidebar is collapsed, hide list entirely (your requirement)
  if (sidebar?.classList.contains("collapsed")) {
    if (flightListEl) flightListEl.style.display = "none";
  } else {
    if (flightListEl) flightListEl.style.display = "";
  }

  setTimeout(() => {
    map.resize();
    // re-fit for current mode
    if (mapMode === "countries") {
      fitToVisibleCountries();
    } else {
      applyIsolation();
    }
  }, 250);
});

// Countries toggle
countriesBox?.addEventListener("click", () => {
  mapMode = mapMode === "routes" ? "countries" : "routes";
  applyMapMode();
});
