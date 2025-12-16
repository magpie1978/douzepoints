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

// Safety guardrail
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
const callsignEl = document.getElementById("callsignFilter");
const reloadBtn = document.getElementById("reloadBtn");
const statusEl = document.getElementById("status");

// =====================================================
// HELPERS
// =====================================================
function setStatus(msg) {
  statusEl.textContent = msg || "";
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
  if (!features.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  features.forEach(f => {
    f.geometry.coordinates.forEach(c => bounds.extend(c));
  });
  map.fitBounds(bounds, { padding: 60, duration: 600 });
}

// =====================================================
// LOAD FILTER OPTIONS (from journeys_filters)
// =====================================================
async function loadFilters() {
  const { data, error } = await sb
    .from("journeys_filters")
    .select("year, airline");

  if (error) {
    console.error("Filter load error:", error);
    setStatus("Failed to load filters");
    return;
  }

  // ---- YEARS ----
  const yearMap = new Map();
  data.forEach(d => {
    if (d.year) {
      const yearStr = d.year.substring(0, 4); // "2024"
      yearMap.set(yearStr, d.year);            // keep full date value
    }
  });

  const years = [...yearMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0])); // sort by YYYY desc

  yearSelect.innerHTML = years
    .map(([label, value]) =>
      `<option value="${value}">${label}</option>`
    )
    .join("");

  // ---- AIRLINES ----
  const airlines = [...new Set(data.map(d => d.airline).filter(a => a))].sort();

  airlineSelect.innerHTML =
    `<option value="">All airlines</option>` +
    airlines.map(a => `<option value="${a}">${a}</option>`).join("");

  // ---- DEFAULT YEAR (latest) ----
  if (years.length) {
    yearSelect.value = years[0][1]; // full date value
  }

  console.log("Filters loaded:", {
    years: years.map(y => y[0]),
    airlines
  });
}


// =====================================================
// LOAD & RENDER ROUTES (from journeys_routes)
// =====================================================
async function loadRoutes() {
  setStatus("Loading routes…");

  let q = sb
    .from("journeys_routes")
    .select("uid,callsign,airline,origin,destination,journey_distance,geom");

  // ✅ YEAR GUARD (this is the fix)
  if (yearSelect.value) {
    q = q.eq("year", yearSelect.value);
  }

  if (airlineSelect.value) {
    q = q.eq("airline", airlineSelect.value);
  }

  if (callsignEl.value.trim()) {
    q = q.ilike("callsign", `%${callsignEl.value.trim()}%`);
  }

  const { data, error } = await q;

  if (error) {
    console.error(error);
    setStatus("Failed to load routes");
    clearRoutes();
    return;
  }

  if (!data || !data.length) {
    setStatus("No flights found for this year");
    clearRoutes();
    return;
  }

  if (data.length > MAX_ROUTES) {
    setStatus(`Too many flights (${data.length}) — refine filters`);
    clearRoutes();
    return;
  }

  const features = data.map(r => ({
    type: "Feature",
    geometry: r.geom,
    properties: r
  }));

  const fc = { type: "FeatureCollection", features };

  if (map.getSource("routes")) {
    map.getSource("routes").setData(fc);
  } else {
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
          <strong>${p.callsign}</strong><br/>
          ${p.origin} → ${p.destination}<br/>
          ${p.airline || ""}<br/>
          ${p.journey_distance || ""} mi
        `)
        .addTo(map);
    });
  }

  fitToBounds(features);
  setStatus(`${features.length} flights${yearSelect.value ? ` in ${yearSelect.value}` : ""}`);
}

// =====================================================
// INIT + EVENTS
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
});

yearSelect.addEventListener("change", loadRoutes);
airlineSelect.addEventListener("change", loadRoutes);
reloadBtn.addEventListener("click", loadRoutes);

callsignEl.addEventListener("keydown", e => {
  if (e.key === "Enter") loadRoutes();
});
