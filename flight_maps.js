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
const flightListEl = document.getElementById("flightList");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const reloadBtn = document.getElementById("reloadBtn");

// Glass counters
const journeyNumberEl = document.querySelector("#journeyCounter .glass-number");
const journeyLabelEl = document.querySelector("#journeyCounter .glass-label");

const milesNumberEl = document.querySelector("#milesCounter .glass-number");
const countriesNumberEl = document.querySelector("#countriesCounter .glass-number");
const airlinesNumberEl = document.querySelector("#airlinesCounter .glass-number");
const durationNumberEl = document.querySelector("#durationCounter .glass-number");

const countriesBox = document.getElementById("countriesCounter");

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
  geoms.forEach(g => g?.coordinates?.forEach(c => bounds.extend(c)));
  map.fitBounds(bounds, {
    padding: { top: 120, bottom: 80, left: 80, right: 80 },
    duration: 600,
  });
}

// =====================================================
// GLASS COUNTER ANIMATION
// =====================================================
let rafs = {};

function animateNumber(el, from, to, key) {
  cancelAnimationFrame(rafs[key]);
  const start = performance.now();
  const duration = 420;

  function step(t) {
    const p = Math.min((t - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (p < 1) rafs[key] = requestAnimationFrame(step);
  }

  rafs[key] = requestAnimationFrame(step);
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0h 00min";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function updateDuration(seconds) {
  cancelAnimationFrame(rafs.duration);
  const startVal = Number(durationNumberEl.dataset.seconds || 0);
  const endVal = Math.round(seconds);
  durationNumberEl.dataset.seconds = endVal;

  const start = performance.now();
  const duration = 420;

  function step(t) {
    const p = Math.min((t - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = Math.round(startVal + (endVal - startVal) * eased);
    durationNumberEl.textContent = formatDuration(current);
    if (p < 1) rafs.duration = requestAnimationFrame(step);
  }

  rafs.duration = requestAnimationFrame(step);
}

// =====================================================
// COUNTERS (single source of truth)
// =====================================================
function updateCountersForRoutes(routes) {
  animateNumber(journeyNumberEl, +journeyNumberEl.textContent || 0, routes.length, "journeys");
  journeyLabelEl.textContent = routes.length === 1 ? "journey" : "journeys";

  animateNumber(
    milesNumberEl,
    +milesNumberEl.textContent.replace(/,/g, "") || 0,
    routes.reduce((s, r) => s + (Number(r.journey_distance) || 0), 0),
    "miles"
  );

  animateNumber(
    countriesNumberEl,
    +countriesNumberEl.textContent || 0,
    new Set(routes.map(r => r.destination_country).filter(Boolean)).size,
    "countries"
  );

  animateNumber(
    airlinesNumberEl,
    +airlinesNumberEl.textContent || 0,
    new Set(routes.map(r => r.airline).filter(Boolean)).size,
    "airlines"
  );

  updateDuration(
    routes.reduce((s, r) => s + (Number(r.journey_duration_seconds) || 0), 0)
  );
}

// =====================================================
// SIDEBAR
// =====================================================
function renderSidebar(routes) {
  flightListEl.innerHTML = "";
  routes.forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;
    li.innerHTML = `
      <div class="date">${r.journey_date || ""}</div>
      <div class="route"><strong>${r.callsign || ""}</strong> ${r.origin} → ${r.destination}</div>
    `;
    li.classList.toggle("active", r.uid === isolatedUid);
    li.onclick = () => toggleIsolation(r.uid);
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
    fitToBoundsFromLineGeoms([r.geom]);
    updateCountersForRoutes([r]);
  } else {
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
    updateCountersForRoutes(currentRoutes);
  }
}

// =====================================================
// COUNTRY MODE (Option A – name_en)
// =====================================================
function getVisitedCountryNames() {
  return [...new Set(
    currentRoutes.map(r => r.destination_country).filter(Boolean)
  )];
}

function updateCountryHighlight() {
  const names = getVisitedCountryNames();
  map.setFilter("countries-fill", [
    "in",
    ["get", "name_en"],
    ["literal", names],
  ]);
}

function applyMapMode() {
  map.setLayoutProperty("routes-line", "visibility", mapMode === "routes" ? "visible" : "none");
  map.setLayoutProperty("countries-fill", "visibility", mapMode === "countries" ? "visible" : "none");

  if (mapMode === "countries") updateCountryHighlight();
}

countriesBox.onclick = () => {
  mapMode = mapMode === "routes" ? "countries" : "routes";
  applyMapMode();
};

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;

  let q = sb.from("journeys_routes_cache").select("*");
  const { data } = await q;

  currentRoutes = (data || []).sort(
    (a, b) => new Date(b.journey_date) - new Date(a.journey_date)
  );

  renderSidebar(currentRoutes);
  updateCountersForRoutes(currentRoutes);

  if (!currentRoutes.length) {
    clearSource("routes");
    return;
  }

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

  applyMapMode();
  fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  map.addSource("countries", {
    type: "vector",
    url: "mapbox://mapbox.country-boundaries-v1",
  });

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    "source-layer": "country_boundaries",
    layout: { visibility: "none" },
    paint: { "fill-color": "#FFD700", "fill-opacity": 0.6 },
  });

  await loadRoutes();
});

reloadBtn?.onclick = loadRoutes;
sidebarToggle?.onclick = () => {
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 250);
};
