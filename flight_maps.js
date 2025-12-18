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
const flightListEl = document.getElementById("flightList");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const reloadBtn = document.getElementById("reloadBtn");

// Filter containers (checkbox dropdowns)
const filterYearEl = document.getElementById("filter-year");
const filterAirlineEl = document.getElementById("filter-airline");
const filterTypeEl = document.getElementById("filter-type");

// Glass counters
const journeyBox = document.getElementById("journeyCounter");
const journeyNumberEl = journeyBox?.querySelector(".glass-number");
const journeyLabelEl = journeyBox?.querySelector(".glass-label");

const milesBox = document.getElementById("milesCounter");
const milesNumberEl = milesBox?.querySelector(".glass-number");

const countriesBox = document.getElementById("countriesCounter");
const countriesNumberEl = countriesBox?.querySelector(".glass-number");

const airlinesBox = document.getElementById("airlinesCounter");
const airlinesNumberEl = airlinesBox?.querySelector(".glass-number");

const durationBox = document.getElementById("durationCounter");
const durationNumberEl = durationBox?.querySelector(".glass-number");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;
let mapMode = "routes"; // "routes" | "countries"

// Multi-select filter state
const selected = {
  years: new Set(),     // store "YYYY"
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

function fitToBoundsFromLineGeoms(lineGeoms) {
  if (!lineGeoms?.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  lineGeoms.forEach(g => {
    if (!g?.coordinates) return;
    g.coordinates.forEach(c => bounds.extend(c));
  });

  map.fitBounds(bounds, {
    padding: { top: 120, bottom: 80, left: 80, right: 80 },
    duration: 600,
  });
}


// =====================================================
// HELPERS FOR DISPLAYING COUNTRY VECTOR MAPS
// =====================================================
function fitToVisibleCountries() {
  if (!map.getSource("countries")) return;

  const visited = getVisitedCountryNames();
  if (!visited.length) return;

  // IMPORTANT: classic filter syntax for querySourceFeatures
  const filter = ["in", "name_en", ...visited];

  const features = map.querySourceFeatures("countries", {
    sourceLayer: "country_boundaries",
    filter,
  });

  if (!features.length) return;

  const bounds = new mapboxgl.LngLatBounds();

  features.forEach(f => {
    const g = f.geometry;
    if (!g) return;

    if (g.type === "Polygon") {
      g.coordinates.forEach(ring => ring.forEach(c => bounds.extend(c)));
    } else if (g.type === "MultiPolygon") {
      g.coordinates.forEach(poly =>
        poly.forEach(ring => ring.forEach(c => bounds.extend(c)))
      );
    }
  });

  if (bounds.isEmpty()) return;

  const sidebarWidth =
    sidebar?.classList.contains("collapsed") ? 0 : (sidebar?.offsetWidth || 0);

  map.fitBounds(bounds, {
    padding: { top: 140, bottom: 80, left: sidebarWidth + 80, right: 80 },
    duration: 650,
  });
}


// =====================================================
// AIRPORT VISIBILITY HELPER
// =====================================================
function setAirportVisibility(visible) {
  if (map.getLayer("airports-circle")) {
    map.setLayoutProperty(
      "airports-circle",
      "visibility",
      visible ? "visible" : "none"
    );
  }
}



// =====================================================
// GLASS COUNTERS (ANIMATED)
// =====================================================
let raf = {
  journeys: null,
  miles: null,
  countries: null,
  airlines: null,
  duration: null,
};

function animateInt(el, from, to, key) {
  if (!el) return;
  cancelAnimationFrame(raf[key]);

  const startTime = performance.now();
  const duration = 420;

  function step(t) {
    const p = Math.min((t - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (p < 1) raf[key] = requestAnimationFrame(step);
  }

  raf[key] = requestAnimationFrame(step);
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function animateDuration(el, fromSeconds, toSeconds) {
  if (!el) return;
  cancelAnimationFrame(raf.duration);

  const startTime = performance.now();
  const duration = 420;

  function step(t) {
    const p = Math.min((t - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const cur = Math.round(fromSeconds + (toSeconds - fromSeconds) * eased);
    el.textContent = formatDuration(cur);
    if (p < 1) raf.duration = requestAnimationFrame(step);
  }

  raf.duration = requestAnimationFrame(step);
}

function updateCountersForRoutes(routes) {
  const journeys = routes.length;

  // journeys
  if (journeyNumberEl && journeyLabelEl) {
    journeyLabelEl.textContent = journeys === 1 ? "journey" : "journeys";
    const from = Number(String(journeyNumberEl.textContent).replace(/,/g, "")) || 0;
    animateInt(journeyNumberEl, from, journeys, "journeys");
  }

  // miles
  if (milesNumberEl) {
    const miles = routes.reduce((sum, r) => sum + (Number(r.journey_distance) || 0), 0);
    const from = Number(String(milesNumberEl.textContent).replace(/,/g, "")) || 0;
    animateInt(milesNumberEl, from, Math.round(miles), "miles");
  }

  // countries (names)
  if (countriesNumberEl) {
    const countries = new Set(routes.map(r => r.destination_country).filter(Boolean)).size;
    const from = Number(String(countriesNumberEl.textContent).replace(/,/g, "")) || 0;
    animateInt(countriesNumberEl, from, countries, "countries");
  }

  // airlines
  if (airlinesNumberEl) {
    const airlines = new Set(routes.map(r => r.airline).filter(Boolean)).size;
    const from = Number(String(airlinesNumberEl.textContent).replace(/,/g, "")) || 0;
    animateInt(airlinesNumberEl, from, airlines, "airlines");
  }

  // duration (seconds)
  if (durationNumberEl) {
    const totalSeconds = routes.reduce(
      (sum, r) => sum + (Number(r.journey_duration_seconds) || 0),
      0
    );

    const fromSeconds = Number(durationNumberEl.dataset.seconds || 0);
    const toSeconds = Math.round(totalSeconds);
    durationNumberEl.dataset.seconds = String(toSeconds);

    animateDuration(durationNumberEl, fromSeconds, toSeconds);
  }
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

    const date = r.journey_date ? String(r.journey_date).slice(0, 10) : "";
    const flightNo = r.flight_number ? `${r.flight_number} · ` : "";

    li.innerHTML = `
      <div class="date">${date}</div>
      <div class="route">
        <strong>${flightNo}${r.origin || ""} → ${r.destination || ""}</strong>
      </div>
    `;

    li.classList.toggle("active", r.uid === isolatedUid);

    li.addEventListener("click", () => toggleIsolation(r.uid));

    flightListEl.appendChild(li);
  });
}

// =====================================================
// ISOLATION (sidebar + map click)
// =====================================================
function toggleIsolation(uid) {
  isolatedUid = isolatedUid === uid ? null : uid;
  applyIsolation();
}

function applyIsolation() {
  // routes-line might not exist yet
  if (map.getLayer("routes-line")) {
    map.setPaintProperty("routes-line", "line-opacity", [
      "case",
      ["==", ["get", "uid"], isolatedUid],
      1.0,
      isolatedUid ? 0.12 : 0.85,
    ]);
  }

  // update counters for isolated vs all
  if (isolatedUid) {
    const r = currentRoutes.find(x => x.uid === isolatedUid);
    if (r) {
      updateCountersForRoutes([r]);
      if (r?.geom) fitToBoundsFromLineGeoms([r.geom]);
    }
  } else {
    updateCountersForRoutes(currentRoutes);
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }

  // update sidebar highlight
  if (flightListEl) {
    [...flightListEl.children].forEach(li => {
      li.classList.toggle("active", li.dataset.uid === isolatedUid);
    });
  }

  // keep countries layer in sync if in countries mode
  if (mapMode === "countries") updateCountryHighlight();
}

// =====================================================
// FILTER UI (CHECKBOX DROPDOWNS)
// =====================================================
function buildFilterMenu(containerEl, values, targetSet, onChange) {
  if (!containerEl) return;

  const menu = containerEl.querySelector(".filter-menu");
  const list = containerEl.querySelector(".filter-options");
  const toggleBtn = containerEl.querySelector(".filter-toggle");
  const selectAllBtn = containerEl.querySelector(".select-all");
  const clearBtn = containerEl.querySelector(".clear");

  if (!menu || !list || !toggleBtn || !selectAllBtn || !clearBtn) return;

  list.innerHTML = "";

  values.forEach(v => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${String(v).replace(/"/g, "&quot;")}"> ${v}`;
    const cb = label.querySelector("input");

    cb.checked = targetSet.has(v);

    cb.addEventListener("change", () => {
      if (cb.checked) targetSet.add(v);
      else targetSet.delete(v);
      onChange();
    });

    list.appendChild(label);
  });

  selectAllBtn.onclick = () => {
    targetSet.clear();
    values.forEach(v => targetSet.add(v));
    list.querySelectorAll("input").forEach(cb => (cb.checked = true));
    onChange();
  };

  clearBtn.onclick = () => {
    targetSet.clear();
    list.querySelectorAll("input").forEach(cb => (cb.checked = false));
    onChange();
  };

  toggleBtn.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.toggle("open");
  };
}

// Close dropdowns when clicking outside
document.addEventListener("click", e => {
  if (e.target.closest(".filter")) return;
  document.querySelectorAll(".filter-menu.open").forEach(m => m.classList.remove("open"));
});

// =====================================================
// LOAD FILTER OPTIONS + DEFAULTS
// =====================================================
async function loadFilters() {
  // Pull only what we need for filter options
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type")
    .limit(50000);

  if (error) {
    console.error("[filters] load error:", error);
    return;
  }

  const currentYear = String(new Date().getFullYear()); // 2025 in your timezone

  const years = [...new Set(
    (data || [])
      .map(d => (d.year ? String(d.year).slice(0, 4) : null))
      .filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  const airlines = [...new Set((data || []).map(d => d.airline).filter(Boolean))].sort();
  const types = [...new Set((data || []).map(d => d.journey_type).filter(Boolean))].sort();

  // ---- apply defaults ----
  selected.years.clear();
  if (years.includes(currentYear)) selected.years.add(currentYear);
  else if (years.length) selected.years.add(years[0]);

  selected.types.clear();
  if (types.includes("Flight")) selected.types.add("Flight");

  // airlines default = none (all)
  selected.airlines.clear();

  const onChange = () => loadRoutes();

  buildFilterMenu(filterYearEl, years, selected.years, onChange);
  buildFilterMenu(filterAirlineEl, airlines, selected.airlines, onChange);
  buildFilterMenu(filterTypeEl, types, selected.types, onChange);
}

// =====================================================
// COUNTRY MODE (Option A: names)
// =====================================================
function getVisitedCountryNames() {
  const routes = isolatedUid
    ? currentRoutes.filter(r => r.uid === isolatedUid)
    : currentRoutes;

  return [...new Set(routes.map(r => r.destination_country).filter(Boolean))];
}

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
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#FFD700",
      "fill-opacity": 0.55,
    },
  });

  // hover tooltip
  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
  map.on("mousemove", "countries-fill", e => {
    map.getCanvas().style.cursor = "pointer";
    const f = e.features?.[0];
    if (!f) return;
    popup
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${f.properties?.name_en || ""}</strong>`)
      .addTo(map);
  });
  map.on("mouseleave", "countries-fill", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });
}

function updateCountryHighlight() {
  if (!map.getLayer("countries-fill")) return;

  const visited = getVisitedCountryNames();

  if (!visited.length) {
    map.setFilter("countries-fill", ["==", ["get", "name_en"], "__none__"]);
    return;
  }

  map.setFilter("countries-fill", [
    "in",
    ["get", "name_en"],
    ["literal", visited],
  ]);
}

//function applyMapMode() {
//  if (mapMode === "countries") {
//    ensureCountriesLayer();
//    updateCountryHighlight();

//    if (map.getLayer("routes-line")) map.setLayoutProperty("routes-line", "visibility", "none");
//    if (map.getLayer("routes-hit")) map.setLayoutProperty("routes-hit", "visibility", "none");
//    if (map.getLayer("countries-fill")) map.setLayoutProperty("countries-fill", "visibility", "visible");
//  } else {
//    if (map.getLayer("countries-fill")) map.setLayoutProperty("countries-fill", "visibility", "none");
//    if (map.getLayer("routes-line")) map.setLayoutProperty("routes-line", "visibility", "visible");
//    if (map.getLayer("routes-hit")) map.setLayoutProperty("routes-hit", "visibility", "visible");
//  }
//}

function applyMapMode() {
  if (mapMode === "countries") {
    // Hide routes
    if (map.getLayer("routes-line")) {
      map.setLayoutProperty("routes-line", "visibility", "none");
    }

    // Show country fills
    if (map.getLayer("countries-fill")) {
      map.setLayoutProperty("countries-fill", "visibility", "visible");
    }

    // ✅ KEEP airports visible
    setAirportVisibility(true);

  } else {
    // Show routes
    if (map.getLayer("routes-line")) {
      map.setLayoutProperty("routes-line", "visibility", "visible");
    }

    // Hide country fills
    if (map.getLayer("countries-fill")) {
      map.setLayoutProperty("countries-fill", "visibility", "none");
    }

    // ✅ KEEP airports visible
    setAirportVisibility(true);
  }
}


// Toggle by clicking the Countries box
if (countriesBox) {
  countriesBox.addEventListener("click", () => {
  mapMode = mapMode === "routes" ? "countries" : "routes";
  applyMapMode();

if (mapMode === "countries") {
  // 1) Apply mode (adds source/layer + sets filter)
  applyMapMode();

  // 2) Zoom out a bit so country tiles/geometry load beyond the current route view
  //    (duration 0 keeps it instant and avoids a “double animation” feel)
  map.easeTo({ zoom: Math.min(map.getZoom(), 2.2), duration: 0 });

  // 3) Wait until tiles finish loading, THEN compute bounds from full polygons
  map.once("idle", () => {
    fitToVisibleCountries();
  });
} else {
  applyMapMode();
  fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
}
});

}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  isolatedUid = null;

  let q = sb.from("journeys_routes_cache").select("*");

  // YEAR filter: your `year` column is a date like YYYY-01-01
  if (selected.years.size) {
    q = q.in("year", [...selected.years].map(y => `${y}-01-01`));
  }

  if (selected.airlines.size) {
    q = q.in("airline", [...selected.airlines]);
  }

  if (selected.types.size) {
    q = q.in("journey_type", [...selected.types]);
  }

  const { data, error } = await q;

  if (error) {
    console.error("[routes] load error:", error);
    clearSource("routes");
    renderSidebar([]);
    updateCountersForRoutes([]);
    return;
  }

  currentRoutes = (data || [])
    .filter(r => r.geom && r.geom.coordinates && r.geom.coordinates.length)
    .sort((a, b) => new Date(b.journey_date) - new Date(a.journey_date));

  // counters + sidebar
  updateCountersForRoutes(currentRoutes);
  renderSidebar(currentRoutes);

  // empty
  if (!currentRoutes.length) {
    clearSource("routes");
    if (mapMode === "countries") updateCountryHighlight();
    return;
  }

  // safety
  if (currentRoutes.length > MAX_ROUTES) {
    console.warn("Too many routes:", currentRoutes.length);
    clearSource("routes");
    renderSidebar([]);
    updateCountersForRoutes([]);
    return;
  }

  const features = currentRoutes.map(r => ({
    type: "Feature",
    geometry: r.geom,
    properties: r,
  }));

  const fc = { type: "FeatureCollection", features };

  // source
  if (map.getSource("routes")) {
    map.getSource("routes").setData(fc);
  } else {
    map.addSource("routes", { type: "geojson", data: fc });

    // visible line
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

    // invisible hitbox for easier clicking
    map.addLayer({
      id: "routes-hit",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 14,
        "line-opacity": 0,
      },
    });

    // click route to isolate
    map.on("click", "routes-hit", e => {
      const f = e.features?.[0];
      const uid = f?.properties?.uid;
      if (!uid) return;
      toggleIsolation(uid);
    });

    // click empty space to clear isolation
    map.on("click", e => {
      // if click hit a route, handler above already ran
      const hit = map.queryRenderedFeatures(e.point, { layers: ["routes-hit"] });
      if (hit && hit.length) return;
      if (isolatedUid) {
        isolatedUid = null;
        applyIsolation();
      }
    });

    map.on("mouseenter", "routes-hit", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "routes-hit", () => (map.getCanvas().style.cursor = ""));
  }

  // apply view mode (routes vs countries)
  applyMapMode();

  // fit
  fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
}

// =====================================================
// INIT
// =====================================================
map.on("load", async () => {
  // initialise counters to non-null states
  if (durationNumberEl) {
    durationNumberEl.dataset.seconds = "0";
    durationNumberEl.textContent = "0h 00min";
  }

  updateCountersForRoutes([]);

  // load filter menus & defaults (Year=2025, Type=Flight)
  await loadFilters();

  // load routes with defaults applied
  await loadRoutes();

  map.resize();
});

// =====================================================
// SAFE EVENT BINDINGS
// =====================================================
if (reloadBtn) {
  reloadBtn.addEventListener("click", loadRoutes);
}

if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    setTimeout(() => map.resize(), 250);
  });
}
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
// DOM
// =====================================================
const sidebar = document.getElementById("sidebar");
const flightListEl = document.getElementById("flightList");
const sidebarToggle = document.getElementById("sidebarToggle");
const reloadBtn = document.getElementById("reloadBtn");

// Glass boxes
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
let mapMode = "routes"; // "routes" | "countries"

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

function fitToBoundsFromLineGeoms(lineGeoms) {
  if (!lineGeoms?.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  lineGeoms.forEach(g => {
    if (!g?.coordinates) return;
    g.coordinates.forEach(c => bounds.extend(c));
  });

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: sidebar?.classList.contains("collapsed") ? 80 : sidebar.offsetWidth + 80,
      right: 80,
    },
    duration: 650,
  });
}

// =====================================================
// COUNTERS (simple, already animated elsewhere)
// =====================================================
function updateCountersForRoutes(routes) {
  // Journeys
  const journeyCount = routes.length;
  journeyNumberEl.textContent = journeyCount.toLocaleString();
  journeyLabelEl.textContent = journeyCount === 1 ? "journey" : "journeys";

  // Miles
  const miles = routes.reduce(
    (s, r) => s + (Number(r.journey_distance) || 0),
    0
  );
  milesNumberEl.textContent = Math.round(miles).toLocaleString();

  // Countries
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

    li.innerHTML = `
      <div class="date">${r.journey_date?.slice(0, 10) || ""}</div>
      <div class="route">
        <strong>${r.callsign || ""}</strong>
        ${r.origin || ""} → ${r.destination || ""}
      </div>
    `;

    li.classList.toggle("active", r.uid === isolatedUid);
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
    if (r?.geom) {
      fitToBoundsFromLineGeoms([r.geom]);
      updateCountersForRoutes([r]);
    }
  } else {
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
    updateCountersForRoutes(currentRoutes);
  }

  [...flightListEl.children].forEach(li => {
    li.classList.toggle("active", li.dataset.uid === isolatedUid);
  });
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

  if (!codes.size) {
    clearSource("airports");
    return;
  }

  const { data } = await sb
    .from("journey_locations")
    .select("airport_code, city, country, longitude, latitude")
    .in("airport_code", [...codes]);

  const features = (data || [])
    .filter(a => a.longitude && a.latitude)
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
// COUNTRIES LAYER
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

function getVisitedCountryNames() {
  return [...new Set(
    currentRoutes.map(r => r.destination_country).filter(Boolean)
  )];
}

function updateCountryHighlight() {
  if (!map.getLayer("countries-fill")) return;

  const countries = getVisitedCountryNames();
  map.setFilter("countries-fill", ["in", "name_en", ...countries]);
}

function fitToVisibleCountries() {
  if (!map.getSource("countries")) return;

  const visited = getVisitedCountryNames();
  if (!visited.length) return;

  const features = map.querySourceFeatures("countries", {
    sourceLayer: "country_boundaries",
    filter: ["in", "name_en", ...visited],
  });

  if (!features.length) return;

  const bounds = new mapboxgl.LngLatBounds();

  features.forEach(f => {
    const g = f.geometry;
    if (!g) return;

    if (g.type === "Polygon") {
      g.coordinates.forEach(r =>
        r.forEach(c => bounds.extend(c))
      );
    } else if (g.type === "MultiPolygon") {
      g.coordinates.forEach(p =>
        p.forEach(r =>
          r.forEach(c => bounds.extend(c))
        )
      );
    }
  });

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: sidebar?.classList.contains("collapsed") ? 80 : sidebar.offsetWidth + 80,
      right: 80,
    },
    duration: 650,
  });
}

// =====================================================
// MAP MODE
// =====================================================
function applyMapMode() {
  if (mapMode === "countries") {
    ensureCountriesLayer();
    updateCountryHighlight();

    map.setLayoutProperty("routes-line", "visibility", "none");
    map.setLayoutProperty("countries-fill", "visibility", "visible");

    map.once("idle", fitToVisibleCountries);
  } else {
    map.setLayoutProperty("routes-line", "visibility", "visible");
    if (map.getLayer("countries-fill")) {
      map.setLayoutProperty("countries-fill", "visibility", "none");
    }

    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  currentRoutes = (data || [])
    .filter(r => r.geom)
    .sort((a, b) =>
      new Date(b.journey_date) - new Date(a.journey_date)
    );

  updateCountersForRoutes(currentRoutes);
  renderSidebar(currentRoutes);

  // Routes layer
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
  await loadRoutes();
});

sidebarToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 250);
});

reloadBtn?.addEventListener("click", loadRoutes);

// Toggle countries view by clicking COUNTRIES box
countriesBox?.addEventListener("click", () => {
  mapMode = mapMode === "routes" ? "countries" : "routes";
  applyMapMode();
});

