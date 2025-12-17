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
const typeSelect = document.getElementById("typeSelect");
const reloadBtn = document.getElementById("reloadBtn");
const statusEl = document.getElementById("status");
const flightListEl = document.getElementById("flightList");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;

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
      features: [],
    });
  }
}

function clearAirports() {
  if (map.getSource("airports")) {
    map.getSource("airports").setData({
      type: "FeatureCollection",
      features: [],
    });
  }
}

function fitToBounds(features) {
  if (!features.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  features.forEach(f => {
    f.geometry.coordinates.forEach(c => bounds.extend(c));
  });

  map.fitBounds(bounds, { padding: 70, duration: 600 });
}

// =====================================================
// SIDEBAR
// =====================================================
function renderFlightList(routes) {
  flightListEl.innerHTML = "";

  routes.forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;

    const date = r.journey_date
      ? r.journey_date.slice(0, 10)
      : "";

    li.innerHTML =
      '<div style="font-size:12px; opacity:0.7;">' + date + '</div>' +
      '<div><strong>' + r.origin + ' → ' + r.destination + '</strong></div>';

    if (r.uid === isolatedUid) {
      li.classList.add("active");
    }

    li.addEventListener("click", () => {
      isolateFlight(r.uid);
    });

    flightListEl.appendChild(li);
  });
}



function isolateFlight(uid) {
  isolatedUid = isolatedUid === uid ? null : uid;
  applyIsolation();
}

function applyIsolation() {
  if (!map.getLayer("routes-line")) return;

  map.setPaintProperty("routes-line", "line-opacity", [
    "case",
    ["==", ["get", "uid"], isolatedUid],
    1.0,
    isolatedUid ? 0.12 : 0.85,
  ]);

  if (isolatedUid) {
    const r = currentRoutes.find(r => r.uid === isolatedUid);
    if (r) {
      const bounds = new mapboxgl.LngLatBounds();
      r.geom.coordinates.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, { padding: 90, duration: 600 });
    }
  }

  [...flightListEl.children].forEach(li => {
    li.classList.toggle("active", li.dataset.uid === isolatedUid);
  });
}

// =====================================================
// LOAD FILTER OPTIONS
// =====================================================
async function loadFilters() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type");

  if (error) {
    console.error(error);
    setStatus("Failed to load filters");
    return;
  }

  // ---- YEARS ----
  const yearMap = new Map();
  data.forEach(d => {
    if (d.year) yearMap.set(d.year.substring(0, 4), d.year);
  });

  const years = [...yearMap.entries()].sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  yearSelect.innerHTML =
    `<option value="">All</option>` +
    years.map(([label, value]) =>
      `<option value="${value}">${label}</option>`
    ).join("");

  if (years.length) yearSelect.value = years[0][1];

  // ---- AIRLINES ----
  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))].sort();
  airlineSelect.innerHTML =
    `<option value="">All airlines</option>` +
    airlines.map(a => `<option value="${a}">${a}</option>`).join("");

  // ---- TYPES ----
  const types = [...new Set(data.map(d => d.journey_type).filter(Boolean))].sort();
  typeSelect.innerHTML =
    `<option value="">All types</option>` +
    types.map(t => `<option value="${t}">${t}</option>`).join("");
}

// =====================================================
// LOAD AIRPORT MARKERS
// =====================================================
async function loadAirports(routes) {
  const airportCodes = new Set();
  routes.forEach(r => {
    if (r.origin) airportCodes.add(r.origin);
    if (r.destination) airportCodes.add(r.destination);
  });

  if (!airportCodes.size) {
    clearAirports();
    return;
  }

  const { data, error } = await sb
    .from("journey_locations")
    .select("airport_code, airport, city, country, longitude, latitude")
    .in("airport_code", [...airportCodes]);

  if (error) {
    console.error("Airport load failed:", error);
    return;
  }

  const features = data.map(a => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [a.longitude, a.latitude],
    },
    properties: a,
  }));

  const fc = { type: "FeatureCollection", features };

  if (map.getSource("airports")) {
    map.getSource("airports").setData(fc);
  } else {
    map.addSource("airports", { type: "geojson", data: fc });

    map.addLayer({
      id: "airports-circle",
      type: "circle",
      source: "airports",
      paint: {
        "circle-radius": 5,
        "circle-color": "#ffffff",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#000000",
      },
    });
  }
}

// =====================================================
// LOAD & RENDER ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;
  setStatus("Loading journeys…");

  let q = sb
    .from("journeys_routes_cache")
    .select(
      "uid,callsign,airline,journey_type,origin,destination,journey_distance,journey_date,geom"
    );

  if (yearSelect.value) q = q.eq("year", yearSelect.value);
  if (airlineSelect.value) q = q.eq("airline", airlineSelect.value);
  if (typeSelect.value) q = q.eq("journey_type", typeSelect.value);

  const { data, error } = await q;

  if (error) {
    console.error(error);
    setStatus("Failed to load journeys");
    clearRoutes();
    clearAirports();
    renderFlightList([]);
    return;
  }

  if (!data.length) {
    setStatus("No journeys found");
    clearRoutes();
    clearAirports();
    renderFlightList([]);
    return;
  }

  if (data.length > MAX_ROUTES) {
    setStatus(`Too many journeys (${data.length}) — refine filters`);
    clearRoutes();
    clearAirports();
    renderFlightList([]);
    return;
  }

  /*currentRoutes = data;

  const features = data.map(r => ({
    type: "Feature",
    geometry: r.geom,
    properties: r,
  }));
*/

  currentRoutes = [...data].sort((a, b) => {
  if (!a.journey_date && !b.journey_date) return 0;
  if (!a.journey_date) return 1;
  if (!b.journey_date) return -1;
  return new Date(b.journey_date) - new Date(a.journey_date);
});

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
        "line-width": 1.3,
        "line-opacity": 0.85,
        "line-color": [
          "case",
          ["==", ["get", "journey_type"], "Flight"], "#FFD700",
          ["==", ["get", "journey_type"], "Drive"],  "#1E90FF",
          "#E53935",
        ],
      },
    });
  }

  renderFlightList(data);
  applyIsolation();
  await loadAirports(data);
  fitToBounds(features);
  setStatus(`${data.length} journeys`);
}

// =====================================================
// INIT + EVENTS
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
  map.resize();
});

yearSelect.addEventListener("change", loadRoutes);
airlineSelect.addEventListener("change", loadRoutes);
typeSelect.addEventListener("change", loadRoutes);
reloadBtn.addEventListener("click", loadRoutes);

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 260);
});





