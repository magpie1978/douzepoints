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
// DOM ELEMENTS
// =====================================================
const sidebar = document.getElementById("sidebar");
const flightListEl = document.getElementById("flightList");
const sidebarToggle = document.getElementById("sidebarToggle");
const reloadBtn = document.getElementById("reloadBtn");

const journeyBox = document.getElementById("journeyCounter");
const milesBox = document.getElementById("milesCounter");
const countriesBox = document.getElementById("countriesCounter");

const journeyNumberEl = journeyBox?.querySelector(".glass-number");
const journeyLabelEl = journeyBox?.querySelector(".glass-label");
const milesNumberEl = milesBox?.querySelector(".glass-number");
const countriesNumberEl = countriesBox?.querySelector(".glass-number");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;
let mapMode = "routes"; // routes | countries

const selected = {
  years: new Set(),
  airlines: new Set(),
  types: new Set(),
};

// =====================================================
// HELPERS
// =====================================================
function clearSource(id) {
  if (map.getSource(id)) {
    map.getSource(id).setData({ type: "FeatureCollection", features: [] });
  }
}

function fitToBoundsFromLineGeoms(geoms) {
  if (!geoms?.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  geoms.forEach(g => g.coordinates.forEach(c => bounds.extend(c)));

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: sidebar?.classList.contains("collapsed")
        ? 80
        : sidebar.offsetWidth + 80,
      right: 80,
    },
    duration: 650,
  });
}

// =====================================================
// COUNTERS
// =====================================================
function updateCounters(routes) {
  const count = routes.length;
  journeyNumberEl.textContent = count.toLocaleString();
  journeyLabelEl.textContent = count === 1 ? "journey" : "journeys";

  const miles = routes.reduce(
    (s, r) => s + (Number(r.journey_distance) || 0),
    0
  );
  milesNumberEl.textContent = Math.round(miles).toLocaleString();

  const countries = new Set(
    routes.map(r => r.destination_country).filter(Boolean)
  );
  countriesNumberEl.textContent = countries.size.toLocaleString();
}

// =====================================================
// SIDEBAR
// =====================================================
function renderSidebar(routes) {
  flightListEl.innerHTML = "";

  routes.forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;
    li.classList.toggle("active", r.uid === isolatedUid);

    li.innerHTML = `
      <div class="date">${r.journey_date?.slice(0, 10) || ""}</div>
      <div class="route">
        <strong>${r.callsign || ""}</strong>
        ${r.origin || ""} → ${r.destination || ""}
      </div>
    `;

    li.addEventListener("click", () => toggleIsolation(r.uid));
    flightListEl.appendChild(li);
  });
}

// =====================================================
// ISOLATION
// =====================================================
function toggleIsolation(uid) {
  isolatedUid = isolatedUid === uid ? null : uid;
  applyIsolation();
}

function applyIsolation() {
  if (!map.getLayer("routes-line")) return;

  map.setPaintProperty("routes-line", "line-opacity", [
    "case",
    ["==", ["get", "uid"], isolatedUid],
    1,
    isolatedUid ? 0.12 : 0.85,
  ]);

  if (isolatedUid) {
    const r = currentRoutes.find(x => x.uid === isolatedUid);
    updateCounters([r]);
    fitToBoundsFromLineGeoms([r.geom]);
  } else {
    updateCounters(currentRoutes);
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }

  [...flightListEl.children].forEach(li =>
    li.classList.toggle("active", li.dataset.uid === isolatedUid)
  );
}

// =====================================================
// FILTER UI
// =====================================================
function buildFilterMenu(containerId, values, targetSet) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = container.querySelector(".filter-options");
  list.innerHTML = "";

  values.forEach(v => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${v}"> ${v}`;
    const cb = label.querySelector("input");
    cb.checked = targetSet.has(v);

    cb.addEventListener("change", () => {
      cb.checked ? targetSet.add(v) : targetSet.delete(v);
      loadRoutes();
    });

    list.appendChild(label);
  });

  container.querySelector(".select-all").onclick = () => {
    targetSet.clear();
    values.forEach(v => targetSet.add(v));
    list.querySelectorAll("input").forEach(cb => (cb.checked = true));
    loadRoutes();
  };

  container.querySelector(".clear").onclick = () => {
    targetSet.clear();
    list.querySelectorAll("input").forEach(cb => (cb.checked = false));
    loadRoutes();
  };

  container.querySelector(".filter-toggle").onclick = e => {
    e.stopPropagation();
    container.querySelector(".filter-menu").classList.toggle("open");
  };
}

document.addEventListener("click", e => {
  if (e.target.closest(".filter")) return;
  document
    .querySelectorAll(".filter-menu.open")
    .forEach(m => m.classList.remove("open"));
});

// =====================================================
// LOAD FILTERS (defaults applied)
// =====================================================
async function loadFilters() {
  const { data } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type");

  const years = [...new Set(
    data.map(d => d.year && String(d.year).slice(0, 4)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))].sort();
  const types = [...new Set(data.map(d => d.journey_type).filter(Boolean))].sort();

  selected.years.clear();
  selected.types.clear();

  if (years.includes("2025")) selected.years.add("2025");
  if (types.includes("Flight")) selected.types.add("Flight");

  buildFilterMenu("filter-year", years, selected.years);
  buildFilterMenu("filter-airline", airlines, selected.airlines);
  buildFilterMenu("filter-type", types, selected.types);
}

// =====================================================
// AIRPORTS
// =====================================================
async function loadAirports(routes) {
  const codes = new Set();
  routes.forEach(r => {
    if (r.origin) codes.add(r.origin);
    if (r.destination) codes.add(r.destination);
  });

  if (!codes.size) return clearSource("airports");

  const { data } = await sb
    .from("journey_locations")
    .select("airport_code, longitude, latitude")
    .in("airport_code", [...codes]);

  const fc = {
    type: "FeatureCollection",
    features: data
      .filter(a => a.longitude && a.latitude)
      .map(a => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [a.longitude, a.latitude],
        },
      })),
  };

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
// COUNTRIES MODE
// =====================================================
function ensureCountriesLayer() {
  if (map.getSource("countries")) return;

  map.addSource("countries", {
    type: "vector",
    url: "mapbox://mapbox.country-boundaries-v1",
  });

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    "source-layer": "country_boundaries",
    paint: {
      "fill-color": "#FFD700",
      "fill-opacity": 0.75,
    },
    filter: ["in", "name_en", ""],
  });
}

function applyMapMode() {
  if (mapMode === "countries") {
    ensureCountriesLayer();
    map.setFilter("countries-fill", [
      "in",
      "name_en",
      ...new Set(
        currentRoutes.map(r => r.destination_country).filter(Boolean)
      ),
    ]);

    map.setLayoutProperty("routes-line", "visibility", "none");
    map.setLayoutProperty("countries-fill", "visibility", "visible");

    map.once("idle", () => fitToVisibleCountries());
  } else {
    map.setLayoutProperty("routes-line", "visibility", "visible");
    if (map.getLayer("countries-fill")) {
      map.setLayoutProperty("countries-fill", "visibility", "none");
    }
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }
}

function fitToVisibleCountries() {
  const features = map.querySourceFeatures("countries", {
    sourceLayer: "country_boundaries",
  });

  if (!features.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  features.forEach(f =>
    f.geometry.coordinates.flat(2).forEach(c => bounds.extend(c))
  );

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: sidebar?.classList.contains("collapsed")
        ? 80
        : sidebar.offsetWidth + 80,
      right: 80,
    },
    duration: 650,
  });
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;

  let q = sb.from("journeys_routes_cache").select("*");

  if (selected.years.size) {
    q = q.in(
      "year",
      [...selected.years].map(y => `${y}-01-01`)
    );
  }
  if (selected.airlines.size) q = q.in("airline", [...selected.airlines]);
  if (selected.types.size) q = q.in("journey_type", [...selected.types]);

  const { data } = await q;

  currentRoutes = (data || [])
    .filter(r => r.geom)
    .sort((a, b) => new Date(b.journey_date) - new Date(a.journey_date));

  updateCounters(currentRoutes);
  renderSidebar(currentRoutes);

  const fc = {
    type: "FeatureCollection",
    features: currentRoutes.map(r => ({
      type: "Feature",
      geometry: r.geom,
      properties: r,
    })),
  };

  if (map.getSource("routes")) {
    map.getSource("routes").setData(fc);
  } else {
    map.addSource("routes", { type: "geojson", data: fc });
    map.addLayer({
      id: "routes-line",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 1.4,
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

  await loadAirports(currentRoutes);
  applyMapMode();
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
});

sidebarToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 250);
});

reloadBtn?.addEventListener("click", loadRoutes);

countriesBox?.addEventListener("click", () => {
  mapMode = mapMode === "routes" ? "countries" : "routes";
  applyMapMode();
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
// DOM ELEMENTS
// =====================================================
const sidebar = document.getElementById("sidebar");
const flightListEl = document.getElementById("flightList");
const sidebarToggle = document.getElementById("sidebarToggle");
const reloadBtn = document.getElementById("reloadBtn");

// Glass boxes
const journeyBox = document.getElementById("journeyCounter");
const milesBox = document.getElementById("milesCounter");
const countriesBox = document.getElementById("countriesCounter");
const airlinesBox = document.getElementById("airlinesCounter");
const durationBox = document.getElementById("durationCounter");

const journeyNumberEl = journeyBox?.querySelector(".glass-number");
const journeyLabelEl = journeyBox?.querySelector(".glass-label");
const milesNumberEl = milesBox?.querySelector(".glass-number");
const countriesNumberEl = countriesBox?.querySelector(".glass-number");
const airlinesNumberEl = airlinesBox?.querySelector(".glass-number");
const durationNumberEl = durationBox?.querySelector(".glass-number");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;
let mapMode = "routes"; // routes | countries

const selected = {
  years: new Set(),
  airlines: new Set(),
  types: new Set(),
};

// =====================================================
// HELPERS
// =====================================================
function clearSource(id) {
  if (map.getSource(id)) {
    map.getSource(id).setData({
      type: "FeatureCollection",
      features: [],
    });
  }
}

function fitToBoundsFromLineGeoms(geoms) {
  if (!geoms?.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  geoms.forEach(g => g.coordinates.forEach(c => bounds.extend(c)));

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: sidebar?.classList.contains("collapsed")
        ? 80
        : sidebar.offsetWidth + 80,
      right: 80,
    },
    duration: 650,
  });
}

function formatSecondsToHM(seconds) {
  if (!seconds || seconds <= 0) return "0h 00min";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${String(mins).padStart(2, "0")}min`;
}

// =====================================================
// COUNTERS
// =====================================================
function updateCounters(routes) {
  // Journeys
  const journeyCount = routes.length;
  journeyNumberEl.textContent = journeyCount.toLocaleString();
  journeyLabelEl.textContent =
    journeyCount === 1 ? "journey" : "journeys";

  // Miles
  const miles = routes.reduce(
    (s, r) => s + (Number(r.journey_distance) || 0),
    0
  );
  milesNumberEl.textContent = Math.round(miles).toLocaleString();

  // Countries
  const countrySet = new Set(
    routes.map(r => r.destination_country).filter(Boolean)
  );
  countriesNumberEl.textContent = countrySet.size.toLocaleString();

  // Airlines
  const airlineSet = new Set(
    routes.map(r => r.airline).filter(Boolean)
  );
  airlinesNumberEl.textContent = airlineSet.size.toLocaleString();

  // Duration
  const totalSeconds = routes.reduce(
    (s, r) => s + (Number(r.journey_duration_seconds) || 0),
    0
  );
  durationNumberEl.textContent = formatSecondsToHM(totalSeconds);
}

// =====================================================
// SIDEBAR
// =====================================================
function renderSidebar(routes) {
  flightListEl.innerHTML = "";

  routes.forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;
    li.classList.toggle("active", r.uid === isolatedUid);

    li.innerHTML = `
      <div class="date">${r.journey_date?.slice(0, 10) || ""}</div>
      <div class="route">
        <strong>${r.callsign || ""}</strong>
        ${r.origin || ""} → ${r.destination || ""}
      </div>
    `;

    li.addEventListener("click", () => toggleIsolation(r.uid));
    flightListEl.appendChild(li);
  });
}

// =====================================================
// ISOLATION
// =====================================================
function toggleIsolation(uid) {
  isolatedUid = isolatedUid === uid ? null : uid;
  applyIsolation();
}

function applyIsolation() {
  if (!map.getLayer("routes-line")) return;

  map.setPaintProperty("routes-line", "line-opacity", [
    "case",
    ["==", ["get", "uid"], isolatedUid],
    1,
    isolatedUid ? 0.12 : 0.85,
  ]);

  if (isolatedUid) {
    const r = currentRoutes.find(x => x.uid === isolatedUid);
    updateCounters([r]);
    fitToBoundsFromLineGeoms([r.geom]);
  } else {
    updateCounters(currentRoutes);
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }

  [...flightListEl.children].forEach(li =>
    li.classList.toggle("active", li.dataset.uid === isolatedUid)
  );
}

// =====================================================
// FILTER UI
// =====================================================
function buildFilterMenu(containerId, values, targetSet) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = container.querySelector(".filter-options");
  list.innerHTML = "";

  values.forEach(v => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${v}"> ${v}`;
    const cb = label.querySelector("input");
    cb.checked = targetSet.has(v);

    cb.addEventListener("change", () => {
      cb.checked ? targetSet.add(v) : targetSet.delete(v);
      loadRoutes();
    });

    list.appendChild(label);
  });

  container.querySelector(".select-all").onclick = () => {
    targetSet.clear();
    values.forEach(v => targetSet.add(v));
    list.querySelectorAll("input").forEach(cb => (cb.checked = true));
    loadRoutes();
  };

  container.querySelector(".clear").onclick = () => {
    targetSet.clear();
    list.querySelectorAll("input").forEach(cb => (cb.checked = false));
    loadRoutes();
  };

  container.querySelector(".filter-toggle").onclick = e => {
    e.stopPropagation();
    container.querySelector(".filter-menu").classList.toggle("open");
  };
}

document.addEventListener("click", e => {
  if (e.target.closest(".filter")) return;
  document
    .querySelectorAll(".filter-menu.open")
    .forEach(m => m.classList.remove("open"));
});

// =====================================================
// LOAD FILTERS (defaults applied)
// =====================================================
async function loadFilters() {
  const { data } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type");

  const years = [...new Set(
    data.map(d => d.year && String(d.year).slice(0, 4)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))].sort();
  const types = [...new Set(data.map(d => d.journey_type).filter(Boolean))].sort();

  selected.years.clear();
  selected.types.clear();

  if (years.includes("2025")) selected.years.add("2025");
  if (types.includes("Flight")) selected.types.add("Flight");

  buildFilterMenu("filter-year", years, selected.years);
  buildFilterMenu("filter-airline", airlines, selected.airlines);
  buildFilterMenu("filter-type", types, selected.types);
}

// =====================================================
// AIRPORTS
// =====================================================
async function loadAirports(routes) {
  const codes = new Set();
  routes.forEach(r => {
    if (r.origin) codes.add(r.origin);
    if (r.destination) codes.add(r.destination);
  });

  if (!codes.size) return clearSource("airports");

  const { data } = await sb
    .from("journey_locations")
    .select("airport_code, longitude, latitude")
    .in("airport_code", [...codes]);

  const fc = {
    type: "FeatureCollection",
    features: data
      .filter(a => a.longitude && a.latitude)
      .map(a => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [a.longitude, a.latitude],
        },
      })),
  };

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
// COUNTRIES MODE
// =====================================================
function ensureCountriesLayer() {
  if (map.getSource("countries")) return;

  map.addSource("countries", {
    type: "vector",
    url: "mapbox://mapbox.country-boundaries-v1",
  });

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    "source-layer": "country_boundaries",
    paint: {
      "fill-color": "#FFD700",
      "fill-opacity": 0.75,
    },
    filter: ["in", "name_en", ""],
  });
}

function applyMapMode() {
  if (mapMode === "countries") {
    ensureCountriesLayer();

    map.setFilter("countries-fill", [
      "in",
      "name_en",
      ...new Set(
        currentRoutes.map(r => r.destination_country).filter(Boolean)
      ),
    ]);

    map.setLayoutProperty("routes-line", "visibility", "none");
    map.setLayoutProperty("countries-fill", "visibility", "visible");

    map.once("idle", () => fitToVisibleCountries());
  } else {
    map.setLayoutProperty("routes-line", "visibility", "visible");
    if (map.getLayer("countries-fill")) {
      map.setLayoutProperty("countries-fill", "visibility", "none");
    }
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }
}

function fitToVisibleCountries() {
  const features = map.querySourceFeatures("countries", {
    sourceLayer: "country_boundaries",
  });

  if (!features.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  features.forEach(f =>
    f.geometry.coordinates.flat(2).forEach(c => bounds.extend(c))
  );

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: sidebar?.classList.contains("collapsed")
        ? 80
        : sidebar.offsetWidth + 80,
      right: 80,
    },
    duration: 650,
  });
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;

  let q = sb.from("journeys_routes_cache").select("*");

  if (selected.years.size) {
    q = q.in(
      "year",
      [...selected.years].map(y => `${y}-01-01`)
    );
  }
  if (selected.airlines.size) q = q.in("airline", [...selected.airlines]);
  if (selected.types.size) q = q.in("journey_type", [...selected.types]);

  const { data } = await q;

  currentRoutes = (data || [])
    .filter(r => r.geom)
    .sort((a, b) => new Date(b.journey_date) - new Date(a.journey_date));

  updateCounters(currentRoutes);
  renderSidebar(currentRoutes);

  const fc = {
    type: "FeatureCollection",
    features: currentRoutes.map(r => ({
      type: "Feature",
      geometry: r.geom,
      properties: r,
    })),
  };

  if (map.getSource("routes")) {
    map.getSource("routes").setData(fc);
  } else {
    map.addSource("routes", { type: "geojson", data: fc });
    map.addLayer({
      id: "routes-line",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 1.4,
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

  await loadAirports(currentRoutes);
  applyMapMode();
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
});

sidebarToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 250);
});

reloadBtn?.addEventListener("click", loadRoutes);

countriesBox?.addEventListener("click", () => {
  mapMode = mapMode === "routes" ? "countries" : "routes";
  applyMapMode();
});

