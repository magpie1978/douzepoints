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
const journeyBox = document.getElementById("journeyCounter");
const journeyNumberEl = journeyBox?.querySelector(".glass-number");
const journeyLabelEl = journeyBox?.querySelector(".glass-label");

const milesBox = document.getElementById("milesCounter");
const milesNumberEl = milesBox?.querySelector(".glass-number");

const countriesBox = document.getElementById("countriesCounter");
const countriesNumberEl = countriesBox?.querySelector(".glass-number");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;
let countriesMode = false;

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
    padding: { top: 120, bottom: 80, left: 80, right: 80 },
    duration: 600,
  });
}

// =====================================================
// GLASS COUNTERS (ANIMATED)
// =====================================================
function animateNumber(el, from, to) {
  const start = performance.now();
  const duration = 420;

  function step(t) {
    const p = Math.min((t - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateJourneyCounter(n) {
  if (!journeyNumberEl || !journeyLabelEl) return;
  journeyLabelEl.textContent = n === 1 ? "journey" : "journeys";
  animateNumber(journeyNumberEl, Number(journeyNumberEl.textContent) || 0, n);
}

function updateMilesCounter(m) {
  if (!milesNumberEl) return;
  animateNumber(milesNumberEl, Number(milesNumberEl.textContent) || 0, Math.round(m));
}

function updateCountriesCounter(n) {
  if (!countriesNumberEl) return;
  animateNumber(countriesNumberEl, Number(countriesNumberEl.textContent) || 0, n);
}

// =====================================================
// SIDEBAR
// =====================================================
function renderSidebar(routes) {
  if (!flightListEl) return;
  flightListEl.innerHTML = "";

  routes.forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;

    li.innerHTML = `
      <div class="date">${r.journey_date?.slice(0, 10) || ""}</div>
      <div class="route">
        <strong>${r.callsign || ""}</strong>
        ${r.origin} → ${r.destination}
      </div>
    `;

    if (r.uid === isolatedUid) li.classList.add("active");
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
    updateJourneyCounter(1);
    updateMilesCounter(r.journey_distance || 0);
    updateCountriesCounter(r.destination_country ? 1 : 0);
    fitToBoundsFromLineGeoms([r.geom]);
  } else {
    recalcCounters(currentRoutes);
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }
}

// =====================================================
// COUNTER RECALC
// =====================================================
function recalcCounters(routes) {
  updateJourneyCounter(routes.length);
  updateMilesCounter(routes.reduce((s, r) => s + (r.journey_distance || 0), 0));
  updateCountriesCounter(new Set(routes.map(r => r.destination_country)).size);
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;
  countriesMode = false;

  let q = sb.from("journeys_routes_cache").select("*");

  if (selected.years.size) {
    q = q.in("year", [...selected.years].map(y => `${y}-01-01`));
  }
  if (selected.airlines.size) q = q.in("airline", [...selected.airlines]);
  if (selected.types.size) q = q.in("journey_type", [...selected.types]);

  const { data, error } = await q;
  if (error) {
    console.error(error);
    return;
  }

  currentRoutes = (data || []).sort(
    (a, b) => new Date(b.journey_date) - new Date(a.journey_date)
  );

  recalcCounters(currentRoutes);
  renderSidebar(currentRoutes);

  if (!currentRoutes.length) {
    clearSource("routes");
    return;
  }

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

  fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  updateJourneyCounter(0);
  updateMilesCounter(0);
  updateCountriesCounter(0);
  await loadRoutes();
  map.resize();
});

// =====================================================
// SAFE EVENT BINDINGS (FIXED)
// =====================================================
if (reloadBtn) {
  reloadBtn.onclick = loadRoutes;
}

if (sidebarToggle && sidebar) {
  sidebarToggle.onclick = () => {
    sidebar.classList.toggle("collapsed");
    setTimeout(() => map.resize(), 250);
  };
}
