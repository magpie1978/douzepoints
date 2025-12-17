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
// DOM ELEMENTS
// =====================================================
const flightListEl = document.getElementById("flightList");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const reloadBtn = document.getElementById("reloadBtn");

// Glass counter container is #journeyCounter (glass-box)
// Number lives in .glass-number, label in .glass-label
const journeyCounterBox = document.getElementById("journeyCounter");
const journeyNumberEl = journeyCounterBox?.querySelector(".glass-number") || null;
const journeyLabelEl = journeyCounterBox?.querySelector(".glass-label") || null;

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;

const selected = {
  years: new Set(),     // holds "YYYY" strings
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
  for (const g of lineGeoms) {
    if (!g?.coordinates?.length) continue;
    for (const c of g.coordinates) bounds.extend(c);
  }

  map.fitBounds(bounds, {
    padding: { top: 120, bottom: 80, left: 80, right: 80 },
    duration: 600,
  });
}

// =====================================================
// GLASS COUNTER (ANIMATED) — updates ONLY the number div
// =====================================================
let counterRAF = null;

function setJourneyLabel(n) {
  if (!journeyLabelEl) return;
  journeyLabelEl.textContent = n === 1 ? "journey" : "journeys";
}

function animateJourneyCount(target) {
  if (!journeyNumberEl) return;

  cancelAnimationFrame(counterRAF);

  const start = Number(journeyNumberEl.textContent) || 0;
  const startTime = performance.now();
  const duration = 420;

  // Keep label correct during/after animation
  setJourneyLabel(target);

  function step(t) {
    const p = Math.min((t - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = Math.round(start + (target - start) * eased);

    journeyNumberEl.textContent = String(value);

    if (p < 1) counterRAF = requestAnimationFrame(step);
  }

  counterRAF = requestAnimationFrame(step);
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

    const date = r.journey_date ? r.journey_date.slice(0, 10) : "";
    li.innerHTML = `
      <div class="date">${date}</div>
      <div class="route">
        <strong>${r.callsign || ""}</strong>
        ${r.origin || ""} → ${r.destination || ""}
      </div>
    `;

    if (r.uid === isolatedUid) li.classList.add("active");
    li.addEventListener("click", () => toggleIsolation(r.uid));
    flightListEl.appendChild(li);
  });
}

// =====================================================
// ISOLATION (click sidebar → fit to that route)
// =====================================================
function toggleIsolation(uid) {
  isolatedUid = isolatedUid === uid ? null : uid;
  applyIsolation();
  // ensure map canvas recalculates after UI interactions
  setTimeout(() => map.resize(), 50);
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
    if (r?.geom?.coordinates?.length) {
      fitToBoundsFromLineGeoms([r.geom]);
    }
  } else {
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }

  // Sync sidebar highlight
  if (flightListEl) {
    [...flightListEl.children].forEach(li => {
      li.classList.toggle("active", li.dataset.uid === isolatedUid);
    });
  }
}

// =====================================================
// FILTER UI (CHECKBOX DROPDOWNS)
// Expected HTML structure:
//  <div id="filter-year" class="filter">
//    <button class="filter-toggle">Year ▾</button>
//    <div class="filter-menu">
//      <div class="filter-actions">
//        <button class="select-all">Select all</button>
//        <button class="clear">Clear</button>
//      </div>
//      <div class="filter-options"></div>
//    </div>
//  </div>
// =====================================================
function buildFilterMenu(containerId, values, targetSet) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Missing filter container:", containerId);
    return;
  }

  const menu = container.querySelector(".filter-menu");
  const list = container.querySelector(".filter-options");
  const toggleBtn = container.querySelector(".filter-toggle");
  const selectAllBtn = container.querySelector(".select-all");
  const clearBtn = container.querySelector(".clear");

  if (!menu || !list || !toggleBtn || !selectAllBtn || !clearBtn) {
    console.error("Filter HTML missing required elements inside:", containerId);
    return;
  }

  list.innerHTML = "";

  values.forEach(v => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${String(v)}"> ${String(v)}`;

    const cb = label.querySelector("input");
    cb.checked = targetSet.has(v);

    cb.addEventListener("change", () => {
      cb.checked ? targetSet.add(v) : targetSet.delete(v);
      loadRoutes();
    });

    list.appendChild(label);
  });

  selectAllBtn.onclick = () => {
    targetSet.clear();
    values.forEach(v => targetSet.add(v));
    list.querySelectorAll("input[type='checkbox']").forEach(cb => (cb.checked = true));
    loadRoutes();
  };

  clearBtn.onclick = () => {
    targetSet.clear();
    list.querySelectorAll("input[type='checkbox']").forEach(cb => (cb.checked = false));
    loadRoutes();
  };

  toggleBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.toggle("open");
  };
}

// Close dropdowns when clicking outside any filter
document.addEventListener("click", (e) => {
  if (e.target.closest(".filter")) return;
  document.querySelectorAll(".filter-menu.open").forEach(m => m.classList.remove("open"));
});

// =====================================================
// LOAD FILTERS (defaults: current year + Flight)
// =====================================================
async function loadFilters() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, airline, journey_type");

  if (error) {
    console.error("Filter load failed:", error);
    return;
  }

  const currentYear = new Date().getFullYear().toString();

  // YEAR options (YYYY)
  const years = [...new Set(
    (data || [])
      .map(d => (d.year ? String(d.year).slice(0, 4) : null))
      .filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  // AIRLINE options
  const airlines = [...new Set(
    (data || []).map(d => d.airline).filter(Boolean)
  )].sort();

  // TYPE options
  const types = [...new Set(
    (data || []).map(d => d.journey_type).filter(Boolean)
  )].sort();

  // Defaults
  selected.years.clear();
  if (years.includes(currentYear)) selected.years.add(currentYear);

  selected.types.clear();
  if (types.includes("Flight")) selected.types.add("Flight");

  // Build menus
  buildFilterMenu("filter-year", years, selected.years);
  buildFilterMenu("filter-airline", airlines, selected.airlines);
  buildFilterMenu("filter-type", types, selected.types);
}

// =====================================================
// AIRPORT MARKERS + HOVER TOOLTIP
// =====================================================
const airportHoverPopup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: 10,
});

let airportHoverBound = false;

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

  const { data, error } = await sb
    .from("journey_locations")
    .select("airport_code, airport, city, country, longitude, latitude")
    .in("airport_code", [...codes]);

  if (error) {
    console.error("Airport load failed:", error);
    return;
  }

  const features = (data || [])
    .filter(a => a.longitude != null && a.latitude != null)
    .map(a => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
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

  // Bind hover handlers once
  if (!airportHoverBound) {
    airportHoverBound = true;

    map.on("mouseenter", "airports-circle", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features?.[0];
      if (!f) return;

      const p = f.properties || {};
      airportHoverPopup
        .setLngLat(f.geometry.coordinates)
        .setHTML(
          `<strong>${p.airport_code || ""}</strong> — ${p.airport || ""}<br/>${p.city || ""}, ${p.country || ""}`
        )
        .addTo(map);
    });

    map.on("mouseleave", "airports-circle", () => {
      map.getCanvas().style.cursor = "";
      airportHoverPopup.remove();
    });
  }
}

// =====================================================
// LOAD ROUTES (sidebar sorted by date)
// =====================================================
async function loadRoutes() {
  isolatedUid = null;

  let q = sb.from("journeys_routes_cache").select("*");

  // years stored as "YYYY", table year is date like "2025-01-01"
  if (selected.years.size) {
    q = q.in("year", [...selected.years].map(y => `${y}-01-01`));
  }
  if (selected.airlines.size) q = q.in("airline", [...selected.airlines]);
  if (selected.types.size) q = q.in("journey_type", [...selected.types]);

  const { data, error } = await q;

  if (error) {
    console.error("Route load failed:", error);
    clearSource("routes");
    clearSource("airports");
    renderSidebar([]);
    animateJourneyCount(0);
    return;
  }

  // Sort newest → oldest for sidebar + internal state
  currentRoutes = (data || [])
    .filter(r => r.journey_date)
    .sort((a, b) => new Date(b.journey_date) - new Date(a.journey_date));

  // Update glass number (label stays visible always)
  animateJourneyCount(currentRoutes.length);

  if (!currentRoutes.length) {
    clearSource("routes");
    clearSource("airports");
    renderSidebar([]);
    return;
  }

  // Guardrail
  if (currentRoutes.length > MAX_ROUTES) {
    clearSource("routes");
    clearSource("airports");
    renderSidebar([]);
    console.warn(`Too many journeys (${currentRoutes.length}) — refine filters`);
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

  renderSidebar(currentRoutes);
  applyIsolation(); // ensures reset fits bounds to all routes
  await loadAirports(currentRoutes);
}

// =====================================================
// INIT + EVENTS
// =====================================================
map.on("load", async () => {
  // Make sure label exists / sane even before data loads
  setJourneyLabel(0);

  await loadFilters();
  await loadRoutes();
  map.resize();
});

reloadBtn?.addEventListener("click", loadRoutes);

sidebarToggle?.addEventListener("click", () => {
  sidebar?.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 250);
});
