/* global mapboxgl, supabase *

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
const MAX_ROUTES = 1000;

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

  map.fitBounds(bounds, { padding: 60, duration: 600 });
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
  //const yearMap = new Map();
  //data.forEach(d => {
  //  if (d.year) {
  //    const label = d.year.substring(0, 4);
  //    yearMap.set(label, d.year);
  //  }
  //});

  //const years = [...yearMap.entries()].sort((a, b) =>
  //  b[0].localeCompare(a[0])
  //);

  //yearSelect.innerHTML = years
  //  .map(([label, value]) => `<option value="${value}">${label}</option>`)
  //  .join("");

  //if (years.length) yearSelect.value = years[0][1];


  // ---- YEARS ----
const yearMap = new Map();
data.forEach(d => {
  if (d.year) {
    const label = d.year.substring(0, 4); // "2025"
    yearMap.set(label, d.year);           // full date value
  }
});

const years = [...yearMap.entries()].sort((a, b) =>
  b[0].localeCompare(a[0])
);

// Add "All" option at the top
yearSelect.innerHTML =
  `<option value="">All</option>` +
  years
    .map(([label, value]) => `<option value="${value}">${label}</option>`)
    .join("");

// ✅ Default to latest year (not "All")
if (years.length) {
  yearSelect.value = years[0][1];
}


  
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

  console.log("Filters loaded:", {
    years: years.map(y => y[0]),
    airlines,
    types,
  });
}

// =====================================================
// LOAD & RENDER ROUTES
// =====================================================
async function loadRoutes() {
  setStatus("Loading routes…");

  let q = sb
    .from("journeys_routes_cache")
    .select(
      "uid,callsign,airline,journey_type,origin,destination,journey_distance,geom"
    );

  if (yearSelect.value) q = q.eq("year", yearSelect.value);
  if (airlineSelect.value) q = q.eq("airline", airlineSelect.value);
  if (typeSelect.value) q = q.eq("journey_type", typeSelect.value);

  const cs = callsignEl.value.trim();
  if (cs) q = q.ilike("callsign", `%${cs}%`);

  const { data, error } = await q;

  if (error) {
    console.error(error);
    setStatus("Failed to load routes");
    clearRoutes();
    return;
  }

  if (!data.length) {
    setStatus("No journeys found");
    clearRoutes();
    return;
  }

  if (data.length > MAX_ROUTES) {
    setStatus(`Too many journeys (${data.length}) — refine filters`);
    clearRoutes();
    return;
  }

  const features = data.map(r => ({
    type: "Feature",
    geometry: r.geom,
    properties: {
      ...r,
      journey_type: r.journey_type, // avoid GeoJSON "type" collision
    },
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
        "line-width": 1.2,
        "line-opacity": 0.8,
        "line-color": [
          "case",
          ["==", ["get", "journey_type"], "Flight"],
          "#FFD700", // yellow

          ["==", ["get", "journey_type"], "Drive"],
          "#1E90FF", // blue

          "#E53935", // red (everything else)
        ],
      },
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
          <em>${p.journey_type}</em><br/>
          ${p.airline || ""}<br/>
          ${p.journey_distance || ""} mi
        `)
        .addTo(map);
    });
  }

  fitToBounds(features);
  setStatus(`${features.length} journeys`);
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
typeSelect.addEventListener("change", loadRoutes);
reloadBtn.addEventListener("click", loadRoutes);

callsignEl.addEventListener("keydown", e => {
  if (e.key === "Enter") loadRoutes();
});
*/



/*
--- 2nd Version ---
/* global mapboxgl, supabase *

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
const MAX_ROUTES = 1000;

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

function clearAirports() {
  if (map.getSource("airports")) {
    map.getSource("airports").setData({
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
    if (d.year) {
      const label = d.year.substring(0, 4);
      yearMap.set(label, d.year);
    }
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
    console.error("Failed to load airports:", error);
    return;
  }

  const features = data.map(a => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [a.longitude, a.latitude]
    },
    properties: a
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
        "circle-stroke-color": "#000000"
      }
    });

    map.on("mouseenter", "airports-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "airports-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", "airports-circle", e => {
      const p = e.features[0].properties;
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <strong>${p.airport_code}</strong><br/>
          ${p.airport}<br/>
          ${p.city}, ${p.country}
        `)
        .addTo(map);
    });
  }
}

// =====================================================
// LOAD & RENDER ROUTES
// =====================================================
async function loadRoutes() {
  setStatus("Loading routes…");

  let q = sb
    .from("journeys_routes_cache")
    .select("uid,callsign,airline,journey_type,origin,destination,journey_distance,geom");

  if (yearSelect.value) q = q.eq("year", yearSelect.value);
  if (airlineSelect.value) q = q.eq("airline", airlineSelect.value);
  if (typeSelect.value) q = q.eq("journey_type", typeSelect.value);

  const cs = callsignEl.value.trim();
  if (cs) q = q.ilike("callsign", `%${cs}%`);

  const { data, error } = await q;

  if (error) {
    console.error(error);
    setStatus("Failed to load routes");
    clearRoutes();
    clearAirports();
    return;
  }

  if (!data.length) {
    setStatus("No journeys found");
    clearRoutes();
    clearAirports();
    return;
  }

  if (data.length > MAX_ROUTES) {
    setStatus(`Too many journeys (${data.length}) — refine filters`);
    clearRoutes();
    clearAirports();
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
        "line-width": 1.3,
        "line-opacity": 0.85,
        "line-color": [
          "case",
          ["==", ["get", "journey_type"], "Flight"], "#FFD700",
          ["==", ["get", "journey_type"], "Drive"],  "#1E90FF",
          "#E53935"
        ]
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
          <em>${p.journey_type}</em><br/>
          ${p.airline || ""}<br/>
          ${p.journey_distance || ""} mi
        `)
        .addTo(map);
    });
  }

  await loadAirports(data);
  fitToBounds(features);
  setStatus(`${features.length} journeys`);
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
typeSelect.addEventListener("change", loadRoutes);
reloadBtn.addEventListener("click", loadRoutes);

callsignEl.addEventListener("keydown", e => {
  if (e.key === "Enter") loadRoutes();
});




/* 3rd version */
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
const callsignEl = document.getElementById("callsignFilter");
const reloadBtn = document.getElementById("reloadBtn");
const statusEl = document.getElementById("status");
const flightListEl = document.getElementById("flightList");

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
    li.textContent = `${r.callsign} · ${r.origin} → ${r.destination}`;
    li.dataset.uid = r.uid;

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

  // Zoom to isolated route
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
    if (d.year) {
      yearMap.set(d.year.substring(0, 4), d.year);
    }
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
      "uid,callsign,airline,journey_type,origin,destination,journey_distance,geom"
    );

  if (yearSelect.value) q = q.eq("year", yearSelect.value);
  if (airlineSelect.value) q = q.eq("airline", airlineSelect.value);
  if (typeSelect.value) q = q.eq("journey_type", typeSelect.value);

  const cs = callsignEl.value.trim();
  if (cs) q = q.ilike("callsign", `%${cs}%`);

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

  currentRoutes = data;

  const features = data.map(r => ({
    type: "Feature",
    geometry: r.geom,
    properties: r,
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
});

yearSelect.addEventListener("change", loadRoutes);
airlineSelect.addEventListener("change", loadRoutes);
typeSelect.addEventListener("change", loadRoutes);
reloadBtn.addEventListener("click", loadRoutes);

callsignEl.addEventListener("keydown", e => {
  if (e.key === "Enter") loadRoutes();
});






