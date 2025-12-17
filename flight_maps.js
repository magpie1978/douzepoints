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

