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

// Guardrail for Mapbox performance
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
// UI ELEMENTS (match your HTML ids)
// =====================================================
const yearSelect = document.getElementById("yearSelect");           // optional
const airlineSelect = document.getElementById("airlineSelect");     // optional
const daysBackEl = document.getElementById("daysBack");             // optional
const callsignEl = document.getElementById("callsignFilter");       // "Callsign contains"
const reloadBtn = document.getElementById("reloadBtn");             // Reload button
const statusEl = document.getElementById("status");

// =====================================================
// SMALL HELPERS
// =====================================================
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

function safeValue(el) {
  return el ? (el.value ?? "").toString().trim() : "";
}

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
      "line-opacity": 0.85,
    },
  });

  map.on("mouseenter", "routes-line", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "routes-line", () => (map.getCanvas().style.cursor = ""));

  map.on("click", "routes-line", (e) => {
    const p = e.features?.[0]?.properties || {};
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${p.callsign || "Flight"}</strong><br/>
        ${p.origin || "?"} → ${p.destination || "?"}<br/>
        ${p.airline || ""}<br/>
        ${p.journey_distance || ""} mi
      `)
      .addTo(map);
  });
}

function clearRoutes() {
  if (map.getSource("routes")) {
    map.getSource("routes").setData({ type: "FeatureCollection", features: [] });
  }
}

function fitToBounds(features) {
  if (!features.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  for (const f of features) {
    const coords = f.geometry?.coordinates || [];
    for (const c of coords) bounds.extend(c);
  }
  map.fitBounds(bounds, { padding: 60, duration: 600 });
}

// =====================================================
// LOAD FILTER OPTIONS (uses journeys_flights)
// =====================================================
async function loadFilters() {
  // If you don't have year/airline dropdowns in the HTML, skip silently.
  if (!yearSelect && !airlineSelect) return;

  const { data, error } = await sb
    .from("journeys_flights")
    .select("year, airline");

  if (error) {
    console.error(error);
    setStatus("Failed to load filters");
    return;
  }

  const years = [...new Set((data || []).map((d) => d.year).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  const airlines = [...new Set((data || []).map((d) => d.airline).filter(Boolean))].sort();

  if (yearSelect) {
    yearSelect.innerHTML =
      `<option value="">All years</option>` +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");

    // default to latest year to avoid loading everything
    if (years.length) yearSelect.value = years[0];
  }

  if (airlineSelect) {
    airlineSelect.innerHTML =
      `<option value="">All airlines</option>` +
      airlines.map((a) => `<option value="${a}">${a}</option>`).join("");
  }
}

// =====================================================
// LOAD & RENDER ROUTES (uses journeys_routes)
// =====================================================
async function loadRoutes() {
  setStatus("Loading routes…");

  const year = safeValue(yearSelect);
  const airline = safeValue(airlineSelect);
  const callsignText = safeValue(callsignEl);
  const daysBack = safeValue(daysBackEl);

  let q = sb
    .from("journeys_routes")
    .select("uid,callsign,airline,origin,destination,journey_distance,year,geom");

  // Optional filters
  if (year) q = q.eq("year", year);
  if (airline) q = q.eq("airline", airline);

  // Callsign contains (case-insensitive)
  if (callsignText) {
    q = q.ilike("callsign", `%${callsignText}%`);
  }

  // Optional "days back" filter:
  // journeys_routes has no timestamp column by design, so we filter on year only.
  // If you want true date filtering, we can add flight_date / first_timestamp to journeys_flights,
  // and filter uids via journeys_flights first.
  if (daysBack) {
    // No-op for now; leaving this comment so behaviour is explicit.
  }

  const { data, error } = await q;

  if (error) {
    console.error(error);
    setStatus(`Error loading routes: ${error.message}`);
    clearRoutes();
    return;
  }

  const rows = data || [];

  if (!rows.length) {
    setStatus("No flights match your filters.");
    clearRoutes();
    return;
  }

  if (rows.length > MAX_ROUTES) {
    setStatus(`Too many flights (${rows.length}) — refine filters.`);
    clearRoutes();
    return;
  }

  // Build GeoJSON FeatureCollection (geom is already JSON from your view)
  const features = rows.map((r) => ({
    type: "Feature",
    geometry: r.geom,
    properties: {
      uid: r.uid,
      callsign: r.callsign,
      airline: r.airline,
      origin: r.origin,
      destination: r.destination,
      journey_distance: r.journey_distance,
    },
  }));

  const fc = { type: "FeatureCollection", features };

  upsertRoutes(fc);
  fitToBounds(features);

  setStatus(`${features.length} flights`);
}

// =====================================================
// INIT + EVENTS
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
});

// Reload button (if present)
if (reloadBtn) reloadBtn.addEventListener("click", loadRoutes);

// Change events (if present)
if (yearSelect) yearSelect.addEventListener("change", loadRoutes);
if (airlineSelect) airlineSelect.addEventListener("change", loadRoutes);

// Enter key in callsign box triggers reload
if (callsignEl) {
  callsignEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadRoutes();
  });
}
