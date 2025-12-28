// =====================================================
// SAFE GLOBAL STATE (prevents redeclaration errors)
// =====================================================
if (typeof window.lastRoutesBounds === "undefined") {
  window.lastRoutesBounds = null;
}

// =====================================================
// MAP INIT - Dark theme, UK-centric starting view
// =====================================================
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: [-1.5, 53.5],
  zoom: 4,
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

// =====================================================
// BASE MAP CLEANUP
// =====================================================

// Remove sub-country borders
function hideSubCountryBorders() {
  const layers = map.getStyle().layers || [];
  layers.forEach(layer => {
    const id = layer.id || "";
    if (
      id.includes("admin-1") ||
      id.includes("admin-2") ||
      id.includes("boundary-state") ||
      id.includes("boundary-province")
    ) {
      try {
        map.setLayoutProperty(id, "visibility", "none");
      } catch {}
    }
  });
}

// Remove city labels
function hideCityLabels() {
  const layers = map.getStyle().layers || [];
  layers.forEach(layer => {
    const id = layer.id || "";
    if (
      id.includes("place-city") ||
      id.includes("place-town") ||
      id.includes("place-village") ||
      id.includes("settlement") ||
      (id.includes("place-label") && !id.includes("country"))
    ) {
      try {
        map.setLayoutProperty(id, "visibility", "none");
      } catch {}
    }
  });
}

// =====================================================
// ROUTE FITTING
// =====================================================
function fitToBoundsFromLineGeoms(geoms) {
  if (!geoms?.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  geoms.forEach(g => {
    if (!g?.coordinates?.length) return;
    g.coordinates.forEach(c => bounds.extend(c));
  });

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: getSidebarLeftPad(),
      right: 80,
    },
    duration: 650,
  });
}

// =====================================================
// VIEW RESTORATION
// =====================================================
function storeCurrentMapBoundsAsLastRoutes() {
  try {
    window.lastRoutesBounds = map.getBounds();
  } catch {
    window.lastRoutesBounds = null;
  }
}

function revertToLastRoutesBoundsOrAllRoutes() {
  if (window.lastRoutesBounds) {
    map.fitBounds(window.lastRoutesBounds, {
      padding: {
        top: 140,
        bottom: 80,
        left: getSidebarLeftPad(),
        right: 80,
      },
      duration: 650,
    });
  } else if (Array.isArray(currentRoutes)) {
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }
}

// =====================================================
// COUNTRIES MODE (Mapbox boundaries)
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
      "fill-color": "#C9A24D",
      "fill-opacity": 0.45,
    },
    filter: ["in", "name_en", ""],
  });
}

function setCountriesFilterFromRoutes(routes) {
  ensureCountriesLayer();
  const names = [...new Set(
    (routes || []).map(r => r.destination_country).filter(Boolean)
  )];
  map.setFilter("countries-fill", ["in", "name_en", ...names]);
}

function fitToVisibleCountries() {
  if (!map.getLayer("countries-fill")) return;

  const rendered = map.queryRenderedFeatures({ layers: ["countries-fill"] });
  if (!rendered?.length) return;

  const bounds = new mapboxgl.LngLatBounds();

  rendered.forEach(f => {
    const walk = c => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === "number" && typeof c[1] === "number") {
        bounds.extend(c);
      } else {
        c.forEach(walk);
      }
    };
    walk(f.geometry?.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 80,
      left: getSidebarLeftPad(),
      right: 80,
    },
    duration: 650,
  });
}

// =====================================================
// MAP MODE SWITCHING (FINAL FIX)
// =====================================================
function applyMapMode() {
  if (mapMode === "countries") {

    // 🔐 Snapshot routes camera BEFORE switching
    storeCurrentMapBoundsAsLastRoutes();

    if (map.getLayer("routes-line")) map.setLayoutProperty("routes-line", "visibility", "none");
    if (map.getLayer("routes-hit")) map.setLayoutProperty("routes-hit", "visibility", "none");
    if (map.getLayer("airports-circle")) map.setLayoutProperty("airports-circle", "visibility", "none");

    const visibleRoutes = isolatedUid
      ? currentRoutes.filter(r => r.uid === isolatedUid)
      : currentRoutes;

    setCountriesFilterFromRoutes(visibleRoutes);

    if (map.getLayer("countries-fill")) {
      map.setLayoutProperty("countries-fill", "visibility", "visible");
    }

    map.once("idle", fitToVisibleCountries);

  } else {
    // ROUTES MODE

    if (map.getLayer("countries-fill")) {
      map.setLayoutProperty("countries-fill", "visibility", "none");
    }
    if (map.getLayer("routes-line")) map.setLayoutProperty("routes-line", "visibility", "visible");
    if (map.getLayer("routes-hit")) map.setLayoutProperty("routes-hit", "visibility", "visible");
    if (map.getLayer("airports-circle")) map.setLayoutProperty("airports-circle", "visibility", "visible");

    // 🔁 Restore previous routes camera view
    revertToLastRoutesBoundsOrAllRoutes();

    // 🎯 Re-apply isolation STYLING ONLY (no zoom)
    if (isolatedUid && typeof highlightIsolatedRoute === "function") {
      highlightIsolatedRoute(isolatedUid);
    }
  }
}
