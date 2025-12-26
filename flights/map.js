// =====================================================
// MAP INIT - Initialises the Mapbox map: Dark theme, UK-centric starting view, Moderate zoom
// =====================================================
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: [-1.5, 53.5],
  zoom: 4,
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");  /* Adds zoom + rotation controls to the map UI */



// Remove Country Borders
function hideSubCountryBorders() {
  const layers = map.getStyle().layers;

  layers.forEach(layer => {
    const id = layer.id;

    // Hide admin-1 and admin-2 borders (states / regions)
    if (
      id.includes("admin-1") ||
      id.includes("admin-2") ||
      id.includes("boundary-state") ||
      id.includes("boundary-province")
    ) {
      try {
        map.setLayoutProperty(id, "visibility", "none");
      } catch (e) {
        // layer might not support layout visibility
      }
    }
  });
}


// Remove City Names
function hideCityLabels() {
  const layers = map.getStyle().layers;

  layers.forEach(layer => {
    const id = layer.id || "";

    // Hide city / town / settlement labels
    if (
      id.includes("place-city") ||
      id.includes("place-town") ||
      id.includes("place-village") ||
      id.includes("settlement") ||
      id.includes("place-label") && !id.includes("country")
    ) {
      try {
        map.setLayoutProperty(id, "visibility", "none");
      } catch (e) {
        // Some layers may not support layout visibility
      }
    }
  });
}



// Fit map to route geometries
// Builds a bounding box from all route coordinates.  Fits the map view with UI-aware padding.  Used after loading routes or isolating one.
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

// View restoration helpers
// These support reverting map view after isolation or mode switching
function storeCurrentMapBoundsAsLastRoutes() {
  // Save current camera bounds to revert later
  try {
    lastRoutesBounds = map.getBounds();
  } catch {
    lastRoutesBounds = null;
  }
}



function revertToLastRoutesBoundsOrAllRoutes() {
  if (lastRoutesBounds) {
    map.fitBounds(lastRoutesBounds, {
      padding: {
        top: 140,
        bottom: 80,
        left: getSidebarLeftPad(),
        right: 80,
      },
      duration: 650,
    });
  } else {
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  }
}


// =====================================================
// COUNTRIES MODE (Mapbox country boundaries)
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
    // start empty
    filter: ["in", "name_en", ""],
  });
}

function setCountriesFilterFromRoutes(routes) {
  ensureCountriesLayer();
  const names = [...new Set((routes || []).map(r => r.destination_country).filter(Boolean))];
  map.setFilter("countries-fill", ["in", "name_en", ...names]);
}

function fitToVisibleCountries() {
  if (!map.getLayer("countries-fill")) return;

  // IMPORTANT: query *rendered* features of the countries-fill layer
  // (this respects the filter, so bounds match highlighted countries only)
  const rendered = map.queryRenderedFeatures({ layers: ["countries-fill"] });

  if (!rendered?.length) return;

  const bounds = new mapboxgl.LngLatBounds();

  rendered.forEach(f => {
    const geom = f.geometry;
    // GeoJSON-like polygons
    if (!geom) return;

    // Mapbox can return MultiPolygon / Polygon; coordinates nesting varies.
    const coords = geom.coordinates;

    // flatten safely
    const flat = (arr) => arr.flat ? arr.flat(Infinity) : arr;
    const points = flat(coords);

    // points is now alternating lon/lat values in some cases; safer:
    // walk original structure as [lng,lat] pairs
    const walk = (c) => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === "number" && typeof c[1] === "number") {
        bounds.extend(c);
        return;
      }
      c.forEach(walk);
    };
    walk(coords);
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

function applyMapMode() {
  if (mapMode === "countries") {
    // hide routes + hit buffer + airports
    if (map.getLayer("routes-line")) map.setLayoutProperty("routes-line", "visibility", "none");
    if (map.getLayer("routes-hit")) map.setLayoutProperty("routes-hit", "visibility", "none");
    if (map.getLayer("airports-circle")) map.setLayoutProperty("airports-circle", "visibility", "none");

    const visibleRoutes = isolatedUid
      ? currentRoutes.filter(r => r.uid === isolatedUid)
      : currentRoutes;

    setCountriesFilterFromRoutes(visibleRoutes);

    if (map.getLayer("countries-fill")) map.setLayoutProperty("countries-fill", "visibility", "visible");

    // wait for map to render then fit
    map.once("idle", () => fitToVisibleCountries());
  } else {
    // routes mode
    if (map.getLayer("countries-fill")) map.setLayoutProperty("countries-fill", "visibility", "none");
    if (map.getLayer("routes-line")) map.setLayoutProperty("routes-line", "visibility", "visible");
    if (map.getLayer("routes-hit")) map.setLayoutProperty("routes-hit", "visibility", "visible");
    if (map.getLayer("airports-circle")) map.setLayoutProperty("airports-circle", "visibility", "visible");

    applyIsolation(); // re-apply focusing and counters
  }
}
