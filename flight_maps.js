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
  zoom: 4
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

// =====================================================
// DOM ELEMENTS
// =====================================================
const flightListEl = document.getElementById("flightList");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const reloadBtn = document.getElementById("reloadBtn");
const counterEl = document.getElementById("journeyCounter");

// =====================================================
// STATE
// =====================================================
let currentRoutes = [];
let isolatedUid = null;

const selected = {
  years: new Set(),
  airlines: new Set(),
  types: new Set()
};

// =====================================================
// HELPERS
// =====================================================
function clearSource(id) {
  if (map.getSource(id)) {
    map.getSource(id).setData({
      type: "FeatureCollection",
      features: []
    });
  }
}

function fitToBounds(features) {
  if (!features.length) return;
  const b = new mapboxgl.LngLatBounds();
  features.forEach(f => f.geometry.coordinates.forEach(c => b.extend(c)));
  map.fitBounds(b, { padding: 80, duration: 600 });
}

// =====================================================
// GLASS COUNTER (ANIMATED)
// =====================================================
let counterFrame = null;

function updateCounter(target) {
  if (!counterEl) return;
  cancelAnimationFrame(counterFrame);

  const start = Number(counterEl.textContent) || 0;
  const duration = 400;
  const startTime = performance.now();

  function animate(t) {
    const p = Math.min((t - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    counterEl.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) counterFrame = requestAnimationFrame(animate);
  }

  counterFrame = requestAnimationFrame(animate);
}

// =====================================================
// SIDEBAR
// =====================================================
function renderSidebar(routes) {
  flightListEl.innerHTML = "";

  routes.forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;

    const date = r.journey_date?.slice(0, 10) || "";
    li.innerHTML = `
      <div class="date">${date}</div>
      <div class="route">
        <strong>${r.callsign || ""}</strong>
        ${r.origin} → ${r.destination}
      </div>
    `;

    li.onclick = () => toggleIsolation(r.uid);
    if (r.uid === isolatedUid) li.classList.add("active");
    flightListEl.appendChild(li);
  });
}

function toggleIsolation(uid) {
  isolatedUid = isolatedUid === uid ? null : uid;

  map.setPaintProperty("routes-line", "line-opacity", [
    "case",
    ["==", ["get", "uid"], isolatedUid],
    1,
    isolatedUid ? 0.12 : 0.85
  ]);

  renderSidebar(currentRoutes);
}

// =====================================================
// FILTER UI (CHECKBOX DROPDOWNS)
// =====================================================
function buildFilterMenu(containerId, values, targetSet) {
  const container = document.getElementById(containerId);
  const menu = container.querySelector(".filter-menu");
  const list = menu.querySelector(".filter-options");

  list.innerHTML = "";

  values.forEach(v => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${v}"> ${v}`;
    const cb = label.querySelector("input");
    cb.onchange = () => {
      cb.checked ? targetSet.add(v) : targetSet.delete(v);
      loadRoutes();
    };
    list.appendChild(label);
  });

  menu.querySelector(".select-all").onclick = () => {
    targetSet.clear();
    values.forEach(v => targetSet.add(v));
    list.querySelectorAll("input").forEach(cb => (cb.checked = true));
    loadRoutes();
  };

  menu.querySelector(".clear").onclick = () => {
    targetSet.clear();
    list.querySelectorAll("input").forEach(cb => (cb.checked = false));
    loadRoutes();
  };

  container.querySelector(".filter-toggle").onclick = () =>
    menu.classList.toggle("open");
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
    return;
  }

  const currentYear = new Date().getFullYear().toString();

  // -----------------------------
  // YEARS
  // -----------------------------
  const years = [
    ...new Set(
      data
        .map(d => d.year && String(d.year).substring(0, 4))
        .filter(Boolean)
    )
  ].sort((a, b) => b.localeCompare(a));

  selected.years.clear();

  // Default: current year only
  if (years.includes(currentYear)) {
    selected.years.add(currentYear);
  }

  buildFilterMenu("filter-year", years, selected.years);

  // Tick default year checkbox
  setTimeout(() => {
    document
      .querySelectorAll("#filter-year input[type='checkbox']")
      .forEach(cb => {
        cb.checked = cb.value === currentYear;
      });
  });

  // -----------------------------
  // AIRLINES
  // -----------------------------
  const airlines = [...new Set(data.map(d => d.airline).filter(Boolean))].sort();
  selected.airlines.clear();
  buildFilterMenu("filter-airline", airlines, selected.airlines);

  // -----------------------------
  // TYPES
  // -----------------------------
  const types = [
    ...new Set(data.map(d => d.journey_type).filter(Boolean))
  ].sort();

  selected.types.clear();

  // Default: Flight only
  if (types.includes("Flight")) {
    selected.types.add("Flight");
  }

  buildFilterMenu("filter-type", types, selected.types);

  // Tick default type checkbox
  setTimeout(() => {
    document
      .querySelectorAll("#filter-type input[type='checkbox']")
      .forEach(cb => {
        cb.checked = cb.value === "Flight";
      });
  });
}


// =====================================================
// LOAD AIRPORT MARKERS
// =====================================================
async function loadAirports(routes) {
  const codes = new Set();
  routes.forEach(r => {
    if (r.origin) codes.add(r.origin);
    if (r.destination) codes.add(r.destination);
  });

  const { data } = await sb
    .from("journey_locations")
    .select("airport_code, airport, city, country, longitude, latitude")
    .in("airport_code", [...codes]);

  const features = data.map(a => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
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
        "circle-color": "#fff",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#000"
      }
    });

    map.on("mouseenter", "airports-circle", e => {
      map.getCanvas().style.cursor = "pointer";
      const p = e.features[0].properties;
      new mapboxgl.Popup({ closeButton: false })
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${p.airport_code}</strong><br>${p.city}, ${p.country}`)
        .addTo(map);
    });

    map.on("mouseleave", "airports-circle", () => {
      map.getCanvas().style.cursor = "";
      document.querySelectorAll(".mapboxgl-popup").forEach(p => p.remove());
    });
  }
}

// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  let q = sb.from("journeys_routes_cache").select("*");

  if (selected.years.size)
    q = q.in("year", [...selected.years].map(y => `${y}-01-01`));
  if (selected.airlines.size) q = q.in("airline", [...selected.airlines]);
  if (selected.types.size) q = q.in("journey_type", [...selected.types]);

  const { data } = await q;

  currentRoutes = data || [];
  updateCounter(currentRoutes.length);

  if (!currentRoutes.length) {
    clearSource("routes");
    clearSource("airports");
    renderSidebar([]);
    return;
  }

  const features = currentRoutes.map(r => ({
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
        "line-width": 1.4,
        "line-opacity": 0.85,
        "line-color": [
          "case",
          ["==", ["get", "journey_type"], "Flight"], "#FFD700",
          ["==", ["get", "journey_type"], "Drive"], "#1E90FF",
          "#E53935"
        ]
      }
    });
  }

  renderSidebar(currentRoutes);
  loadAirports(currentRoutes);
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

reloadBtn?.addEventListener("click", loadRoutes);
sidebarToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.resize(), 250);
});
