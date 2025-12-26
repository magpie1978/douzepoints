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
