/* global mapboxgl, supabase */

// =====================================================
// CONFIG
// =====================================================
const SUPABASE_URL = "https://jxmyetsjqkrluxqtevxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXlldHNqcWtybHV4cXRldnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzI2NjYsImV4cCI6MjA4MDYwODY2Nn0.YoXEtsY_Zh1Eeuj0kl11AOaj01VrZzGGKoPhJyQP-iU";

mapboxgl.accessToken =
  "pk.eyJ1IjoiY2hyaXMtZHVuaWdhbiIsImEiOiJjbWo4dDRtbGowM25lM2VzYWV0eHhocHp5In0.kO8gJyPmFLqQhz-kTTDyIQ";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Safety guardrail (keeps Mapbox smooth)
const MAX_ROUTES = 300;

// =====================================================
// MAP INIT
// =====================================================
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: [-1.5, 53.5],
  zoom: 4,
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

// =====================================================
// UI ELEMENTS
// =====================================================
const yearSelect = document.getElementById("yearSelect");
const airlineSelect = document.getElementById("airlineSelect");
const statusEl = document.getElementById("status");

// =====================================================
// LOAD FILTER OPTIONS
// =====================================================
async function loadFilters() {
  const { data, error } = await sb
    .from("journeys_flights")
    .select("year, airline");

  if (error) {
    console.error(error);
    statusEl.textContent = "Failed to load filters";
    return;
  }

  const years = [...new Set(data.map(d => d.year).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));

  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))]
    .sort();

  yearSelect.innerHTML =
    `<option value="">All years</option>` +
    years.map(y => `<option value="${y}">${y}</option>`).join("");

  airlineSelect.innerHTML =
    `<option value="">All airlines</option>` +
    airlines.map(a => `<option value="${a}">${a}</option>`).join("");

  // Default to latest year (prevents loading all history)
  if (years.length) {
    yearSelect.value = years[0];
  }
}

// =====================================================
// LOAD & RENDER ROUTES
// =====================================================
async function loadRoutes() {
  statusEl.textContent = "Loading routes…";

  let q = sb
    .from("journeys_routes")
    .select(
      "uid,callsign,airline,origin,destination,journey_distance,geom"
    );

  if (yearSelect.value) q = q.eq("year", yearSelect.value);
  if (airlineSelect.value) q = q.eq("airline", airlineSelect.value);

  const { data, error } = await q;

  if (error) {
    console.error(error);
    statusEl.textContent = "Failed to load routes";
    return;
  }

  if (!data || !data.length) {
    statusEl.textContent = "No flights found";
    clearRoutes();
    return;
  }

  if (data.length > MAX_ROUTES) {
    statusEl.textContent = `Too many flights (${data.length}) — refine filters`;
    clearRoutes();
    return;
  }

  const features = data.map(r => ({
    type: "Feature",
    geometry: r.geom,
    properties: {
      uid: r.uid,
      callsign: r.callsign,
      airline: r.airline,
      origin: r.origin,
      destination: r.destination,
      journey_distance: r.journey_distance
    }
  }));

  const fc = { type: "FeatureCollection", features };

  upsertRoutes(fc);
  fitToBounds(features);

  statusEl.textContent = `${features.length} flights`;
}

// =====================================================
// MAP HELPERS
// =====================================================
function upsertRoutes(fc) {
  if (map.getSource("routes")) {
    map.getSource("routes").setData(fc);
    return;
  }

  map.addSource("routes", { type: "geojson", data: fc });

  map.addLayer({
    id: "routes-line",
    type: "line",
    source: "routes",
    paint: {
      "line-width": 2.5,
      "line-opacity": 0.85
    }
  });

  map.on("mouseenter", "routes-line", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "routes-line", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("click", "routes-line", e => {
    const p = e.features[0].properties;
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${p.callsign || "Flight"}</strong><br/>
        ${p.origin} → ${p.destination}<br/>
        ${p.airline || ""}<br/>
        ${p.journey_distance || ""} mi
      `)
      .addTo(map);
  });
}

function clearRoutes() {
  if (map.getSource("routes")) {
    map.getSource("routes").setData({
      type: "FeatureCollection",
      features: []
    });
  }
}

function fitToBounds(features) {
  const bounds = new mapboxgl.LngLatBounds();
  features.forEach(f =>
    f.geometry.coordinates.forEach(c => bounds.extend(c))
  );
  map.fitBounds(bounds, { padding: 60, duration: 600 });
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
});

yearSelect.addEventListener("change", loadRoutes);
airlineSelect.addEventListener("change", loadRoutes);
