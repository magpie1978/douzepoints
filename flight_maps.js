/* global mapboxgl, supabase 

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
const flightListEl = document.getElementById("flightList");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const journeyCounterEl = document.getElementById("journeyCounter");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;
let counterAnimFrame = null;

// =====================================================
// HELPERS
// =====================================================
function getMultiSelectValues(selectEl) {
  if (!selectEl) return [];
  return [...selectEl.selectedOptions]
    .map(o => o.value)
    .filter(Boolean);
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
  if (!features?.length) return;
  const bounds = new mapboxgl.LngLatBounds();
  features.forEach(f => f.geometry.coordinates.forEach(c => bounds.extend(c)));
  map.fitBounds(bounds, { padding: 80, duration: 600 });
}

// =====================================================
// GLASS COUNTER (ANIMATED)
// =====================================================
function updateJourneyCounter(target) {
  if (!journeyCounterEl) return;
  const numEl = journeyCounterEl.querySelector(".glass-number");
  if (!numEl) return;

  cancelAnimationFrame(counterAnimFrame);

  const start = parseInt(numEl.textContent || "0", 10);
  const end = target;
  const duration = 400;
  const startTime = performance.now();

  function animate(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    numEl.textContent = Math.round(start + (end - start) * eased);
    if (p < 1) counterAnimFrame = requestAnimationFrame(animate);
  }

  counterAnimFrame = requestAnimationFrame(animate);
}

// =====================================================
// SIDEBAR
// =====================================================
function renderFlightList(routes) {
  if (!flightListEl) return;
  flightListEl.innerHTML = "";

  routes.forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;

    const date = r.journey_date ? String(r.journey_date).slice(0, 10) : "";
    const flightNo = r.callsign ? r.callsign + " · " : "";

    li.innerHTML = `
      <div style="font-size:12px;opacity:.7">${date}</div>
      <div><strong>${flightNo}${r.origin} → ${r.destination}</strong></div>
    `;

    if (r.uid === isolatedUid) li.classList.add("active");
    li.onclick = () => isolateFlight(r.uid);
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
    const r = currentRoutes.find(x => x.uid === isolatedUid);
    if (r?.geom?.coordinates) {
      const b = new mapboxgl.LngLatBounds();
      r.geom.coordinates.forEach(c => b.extend(c));
      map.fitBounds(b, { padding: 90, duration: 600 });
    }
  }

  [...flightListEl.children].forEach(li =>
    li.classList.toggle("active", li.dataset.uid === isolatedUid)
  );
}

// =====================================================
// LOAD FILTER OPTIONS
// =====================================================
async function loadFilters() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type");

  if (error) {
    console.error("Filter load failed:", error);
    return;
  }

  // YEARS
  const yearMap = new Map();
  data.forEach(d => {
    if (d.year) yearMap.set(String(d.year).slice(0, 4), d.year);
  });

  const years = [...yearMap.entries()].sort((a, b) => b[0] - a[0]);
  yearSelect.innerHTML =
    `<option value="">All</option>` +
    years.map(([y, v]) => `<option value="${v}">${y}</option>`).join("");

  if (years.length) yearSelect.options[1].selected = true;

  // AIRLINES
  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))].sort();
  airlineSelect.innerHTML =
    `<option value="">All airlines</option>` +
    airlines.map(a => `<option value="${a}">${a}</option>`).join("");

  // TYPES
  const types = [...new Set(data.map(d => d.journey_type).filter(Boolean))].sort();
  typeSelect.innerHTML =
    `<option value="">All types</option>` +
    types.map(t => `<option value="${t}">${t}</option>`).join("");
}

// =====================================================
// AIRPORT MARKERS
// =====================================================
async function loadAirports(routes) {
  const codes = new Set();
  routes.forEach(r => {
    if (r.origin) codes.add(r.origin);
    if (r.destination) codes.add(r.destination);
  });

  if (!codes.size) {
    clearAirports();
    return;
  }

  const { data, error } = await sb
    .from("journey_locations")
    .select("airport_code, airport, city, country, longitude, latitude")
    .in("airport_code", [...codes]);

  if (error) {
    console.error("Airport load failed:", error);
    return;
  }

  const features = data
    .filter(a => a.longitude != null && a.latitude != null)
    .map(a => ({
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
        "circle-color": "#fff",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#000",
      },
    });
  }
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;

  let q = sb
    .from("journeys_routes_cache")
    .select(
      "uid,callsign,airline,journey_type,origin,destination,journey_distance,journey_date,geom"
    );

  const years = getMultiSelectValues(yearSelect);
  const airlines = getMultiSelectValues(airlineSelect);
  const types = getMultiSelectValues(typeSelect);

  if (years.length) q = q.in("year", years);
  if (airlines.length) q = q.in("airline", airlines);
  if (types.length) q = q.in("journey_type", types);

  const { data, error } = await q;

  if (error || !data?.length) {
    clearRoutes();
    clearAirports();
    renderFlightList([]);
    updateJourneyCounter(0);
    return;
  }

  if (data.length > MAX_ROUTES) {
    alert("Too many journeys — refine filters");
    return;
  }

  currentRoutes = [...data].sort(
    (a, b) => new Date(b.journey_date) - new Date(a.journey_date)
  );

  const features = currentRoutes.map(r => ({
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
          ["==", ["get", "journey_type"], "Drive"], "#1E90FF",
          "#E53935",
        ],
      },
    });
  }

  renderFlightList(currentRoutes);
  updateJourneyCounter(currentRoutes.length);
  await loadAirports(currentRoutes);
  fitToBounds(features);
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
  map.resize();
});

yearSelect?.addEventListener("change", loadRoutes);
airlineSelect?.addEventListener("change", loadRoutes);
typeSelect?.addEventListener("change", loadRoutes);
reloadBtn?.addEventListener("click", loadRoutes);

sidebarToggle?.addEventListener("click", () => {
  sidebar?.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 260);
});
*/



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
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;

const selectedYears = new Set();
const selectedAirlines = new Set();
const selectedTypes = new Set();

// =====================================================
// FILTER DROPDOWNS
// =====================================================
const filters = {
  year: document.getElementById("yearFilter"),
  airline: document.getElementById("airlineFilter"),
  type: document.getElementById("typeFilter"),
};

// Toggle dropdowns
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.onclick = () => {
    const menu = filters[btn.dataset.filter];
    menu.classList.toggle("open");
  };
});

// Close on outside click
document.addEventListener("click", e => {
  if (!e.target.closest(".filter")) {
    Object.values(filters).forEach(f => f.classList.remove("open"));
  }
});

// =====================================================
// FILTER UI BUILDER
// =====================================================
function buildFilterMenu(container, values, selectedSet) {
  container.innerHTML = "";

  const actions = document.createElement("div");
  actions.className = "filter-actions";

  const selAll = document.createElement("button");
  selAll.textContent = "Select all";
  selAll.onclick = () => {
    values.forEach(v => selectedSet.add(v.value));
    loadRoutes();
    buildFilterMenu(container, values, selectedSet);
  };

  const clear = document.createElement("button");
  clear.textContent = "Clear";
  clear.onclick = () => {
    selectedSet.clear();
    loadRoutes();
    buildFilterMenu(container, values, selectedSet);
  };

  actions.append(selAll, clear);
  container.appendChild(actions);

  values.forEach(v => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selectedSet.has(v.value);

    cb.onchange = () => {
      cb.checked ? selectedSet.add(v.value) : selectedSet.delete(v.value);
      loadRoutes();
    };

    label.append(cb, document.createTextNode(v.label));
    container.appendChild(label);
  });
}

// =====================================================
// LOAD FILTER OPTIONS
// =====================================================
async function loadFilters() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type");

  if (error) return console.error(error);

  const yearMap = new Map();
  data.forEach(d => d.year && yearMap.set(String(d.year).slice(0,4), d.year));

  const years = [...yearMap.entries()]
    .sort((a,b) => b[0]-a[0])
    .map(([label,value]) => ({ label, value }));

  selectedYears.add(years[0]?.value);

  buildFilterMenu(filters.year, years, selectedYears);

  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))]
    .sort()
    .map(a => ({ label: a, value: a }));

  buildFilterMenu(filters.airline, airlines, selectedAirlines);

  const types = [...new Set(data.map(d => d.journey_type).filter(Boolean))]
    .sort()
    .map(t => ({ label: t, value: t }));

  buildFilterMenu(filters.type, types, selectedTypes);
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  let q = sb.from("journeys_routes_cache").select(
    "uid,callsign,airline,journey_type,origin,destination,journey_distance,journey_date,geom"
  );

  if (selectedYears.size) q = q.in("year", [...selectedYears]);
  if (selectedAirlines.size) q = q.in("airline", [...selectedAirlines]);
  if (selectedTypes.size) q = q.in("journey_type", [...selectedTypes]);

  const { data, error } = await q;
  if (error || !data) return;

  if (data.length > MAX_ROUTES) {
    alert("Too many journeys — refine filters");
    return;
  }

  currentRoutes = data.sort(
    (a,b) => new Date(b.journey_date) - new Date(a.journey_date)
  );

  const features = currentRoutes.map(r => ({
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
          ["==", ["get","journey_type"], "Flight"], "#FFD700",
          ["==", ["get","journey_type"], "Drive"], "#1E90FF",
          "#E53935"
        ]
      }
    });
  }
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
});

