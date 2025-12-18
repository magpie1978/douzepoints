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
const journeyNumberEl = document.querySelector("#journeyCounter .glass-number");
const journeyLabelEl = document.querySelector("#journeyCounter .glass-label");
const milesNumberEl = document.querySelector("#milesCounter .glass-number");
const countriesNumberEl = document.querySelector("#countriesCounter .glass-number");
const airlinesNumberEl = document.querySelector("#airlinesCounter .glass-number");
const durationNumberEl = document.querySelector("#durationCounter .glass-number");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;

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

function fitToBoundsFromGeoms(geoms) {
  if (!geoms.length) return;
  const bounds = new mapboxgl.LngLatBounds();
  geoms.forEach(g => g.coordinates.forEach(c => bounds.extend(c)));
  map.fitBounds(bounds, {
    padding: {
      top: 120,
      bottom: 80,
      left: sidebar?.classList.contains("collapsed")
        ? 80
        : sidebar.offsetWidth + 80,
      right: 80,
    },
    duration: 600,
  });
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0h 00min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

// =====================================================
// COUNTERS
// =====================================================
function updateCounters(routes) {
  const journeys = routes.length;
  const miles = routes.reduce((s, r) => s + (r.journey_distance || 0), 0);
  const countries = new Set(
    routes.map(r => r.destination_country).filter(Boolean)
  ).size;
  const airlines = new Set(
    routes.map(r => r.airline).filter(Boolean)
  ).size;
  const duration = routes.reduce(
    (s, r) => s + (r.journey_duration_seconds || 0),
    0
  );

  journeyNumberEl.textContent = journeys.toLocaleString();
  journeyLabelEl.textContent = journeys === 1 ? "journey" : "journeys";
  milesNumberEl.textContent = Math.round(miles).toLocaleString();
  countriesNumberEl.textContent = countries.toLocaleString();
  airlinesNumberEl.textContent = airlines.toLocaleString();
  durationNumberEl.textContent = formatDuration(duration);
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
      <div class="date">${r.journey_date || ""}</div>
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

  const routes = isolatedUid
    ? currentRoutes.filter(r => r.uid === isolatedUid)
    : currentRoutes;

  updateCounters(routes);
  renderSidebar(routes);
  fitToBoundsFromGeoms(routes.map(r => r.geom));
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
// LOAD FILTERS (defaults restored)
// =====================================================
async function loadFilters() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type");

  if (error) {
    console.error(error);
    return;
  }

  const years = [...new Set(
    data.map(d => d.year && String(d.year).slice(0, 4)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))].sort();
  const types = [...new Set(data.map(d => d.journey_type).filter(Boolean))].sort();

  selected.years.clear();
  selected.types.clear();
  selected.airlines.clear();

  if (years.includes("2025")) selected.years.add("2025");
  if (types.includes("Flight")) selected.types.add("Flight");

  buildFilterMenu("filter-year", years, selected.years);
  buildFilterMenu("filter-airline", airlines, selected.airlines);
  buildFilterMenu("filter-type", types, selected.types);
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;

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

  currentRoutes = data
    .filter(r => r.geom)
    .sort((a, b) => new Date(b.journey_date) - new Date(a.journey_date));

  updateCounters(currentRoutes);
  renderSidebar(currentRoutes);

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

    // Hit buffer
    map.addLayer({
      id: "routes-hit",
      type: "line",
      source: "routes",
      paint: { "line-width": 18, "line-opacity": 0 },
    });

    map.on("click", "routes-hit", e => {
      toggleIsolation(e.features[0].properties.uid);
    });

    map.on("click", e => {
      const hits = map.queryRenderedFeatures(e.point, {
        layers: ["routes-hit"],
      });
      if (!hits.length && isolatedUid) {
        isolatedUid = null;
        applyIsolation();
      }
    });
  }

  fitToBoundsFromGeoms(currentRoutes.map(r => r.geom));
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  await loadFilters();
  await loadRoutes();
});

reloadBtn?.addEventListener("click", loadRoutes);

sidebarToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 250);
});
