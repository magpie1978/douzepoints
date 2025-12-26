// =====================================================
// RENDER ROUTES (reusable by airports.js)
// =====================================================
function renderRoutes(routes) {
  if (!routes || !routes.length) {
    clearSource("routes");
    clearSource("airports");
    updateAllCounters([]);
    return;
  }

  // Reset isolation when externally rendering
  isolatedUid = null;
  lastRoutesBounds = null;

  updateAllCounters(routes);

  if (airlinesPanel?.classList.contains("visible")) {
    renderAirlinesPanel(routes);
  }

  renderSidebar(routes);

  const fc = {
    type: "FeatureCollection",
    features: routes.map(r => ({
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

    map.addLayer({
      id: "routes-hit",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 18,
        "line-opacity": 0,
      },
    });

    map.on("click", "routes-hit", e => {
      const uid = e.features?.[0]?.properties?.uid;
      if (u


window.renderRoutes = renderRoutes;

      
// =====================================================
// LOAD ROUTES
// =====================================================
async function loadRoutes() {
  // New query = reset isolation + last bounds
  const wasIsolated = !!isolatedUid;
  isolatedUid = null;
  lastRoutesBounds = null;


  let q = sb.from("journeys_routes_cache").select("*");

  if (selected.years.size) {
    q = q.in("year", [...selected.years].map(y => `${y}-01-01`));
  }
  if (selected.airlines.size) q = q.in("airline", [...selected.airlines]);
  if (selected.types.size) q = q.in("journey_type", [...selected.types]);

  const { data, error } = await q;

  if (error) {
    console.error("[routes] load failed:", error);

    // Hard reset UI so you don't get "silent zeros"
    currentRoutes = [];
    updateAllCounters([]);
    renderSidebar([]);
    clearSource("routes");
    clearSource("airports");
    return;
  }

  currentRoutes = (data || [])
    .filter(r => r.geom)
    .sort((a, b) => new Date(b.journey_date) - new Date(a.journey_date));

  // Update UI
renderRoutes(currentRoutes);

  if (airlinesPanel?.classList.contains("visible")) {
  renderAirlinesPanel(currentRoutes);
  }

  renderSidebar(currentRoutes);

  // Safety
  if (currentRoutes.length > MAX_ROUTES) {
    console.warn("[routes] too many routes:", currentRoutes.length);
    clearSource("routes");
    clearSource("airports");
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

    // visible routes
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

    // big invisible hit buffer (so it's easy to click)
    map.addLayer({
      id: "routes-hit",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 18,
        "line-opacity": 0,
      },
    });

    // click route to isolate
    map.on("click", "routes-hit", e => {
      const uid = e.features?.[0]?.properties?.uid;
      if (uid) toggleIsolation(uid);
    });

    map.on("mouseenter", "routes-hit", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "routes-hit", () => {
      map.getCanvas().style.cursor = "";
    });

    // click away to clear isolate
    map.on("click", e => {
      if (!isolatedUid || mapMode !== "routes") return;

      const hits = map.queryRenderedFeatures(e.point, { layers: ["routes-hit"] });
      if (!hits.length) {
        clearIsolation();
      }
    });
  }

  // Airports for current routes
  await loadAirports(currentRoutes);

  // Fit
  if (mapMode === "routes") {
    fitToBoundsFromLineGeoms(currentRoutes.map(r => r.geom));
  } else {
    applyMapMode();
  }
}


// =====================================================
// ISOLATION LOGIC (SIDEBAR OR MAP CLICK)
// =====================================================
function toggleIsolation(uid) {
  if (!isolatedUid && uid) {
    // 🔐 Store current map state BEFORE isolating
    const center = map.getCenter();
    lastNonIsolatedView = {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
  }

  isolatedUid = isolatedUid === uid ? null : uid;
  applyIsolation();
}


function clearIsolation() {
  if (!isolatedUid) return;
  isolatedUid = null;
  applyIsolation();
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
    if (r) {
      fitToBoundsFromLineGeoms([r.geom]);

      // ✅ Update counters for single flight
      updateAllCounters([r]);
    }
  } else {
    // ✅ Restore counters for all filtered routes
    updateAllCounters(currentRoutes);

    if (lastNonIsolatedView) {
      map.easeTo({
        center: lastNonIsolatedView.center,
        zoom: lastNonIsolatedView.zoom,
        bearing: lastNonIsolatedView.bearing,
        pitch: lastNonIsolatedView.pitch,
        duration: 600,
      });
    }
  }

  [...flightListEl.children].forEach(li => {
    li.classList.toggle("active", li.dataset.uid === isolatedUid);
  });
}
