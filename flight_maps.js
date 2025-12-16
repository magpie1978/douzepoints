/* global mapboxgl */
/* global supabase */

// -----------------------------
// 1) CONFIG — fill these in
// -----------------------------
const SUPABASE_URL = "https://jxmyetsjqkrluxqtevxy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXlldHNqcWtybHV4cXRldnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzI2NjYsImV4cCI6MjA4MDYwODY2Nn0.YoXEtsY_Zh1Eeuj0kl11AOaj01VrZzGGKoPhJyQP-iU";
const MAPBOX_TOKEN = "pk.eyJ1IjoiY2hyaXMtZHVuaWdhbiIsImEiOiJjbWo4dDRtbGowM25lM2VzYWV0eHhocHp5In0.kO8gJyPmFLqQhz-kTTDyIQ";

// View name
const VIEW_NAME = "journeys";

// Safety limits (avoid fetching the whole world accidentally)
const MAX_ROWS = 20000;          // cap total track points returned
const MAX_POINTS_PER_FLIGHT = 10000; // downsample per flight if huge

// -----------------------------
// 2) Init clients
// -----------------------------
mapboxgl.accessToken = MAPBOX_TOKEN;


const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------
// 3) Init map
// -----------------------------
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: [-1.5, 53.5], // UK-ish default
  zoom: 4,
});

map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

const statusEl = document.getElementById("status");
const daysBackEl = document.getElementById("daysBack");
const callsignEl = document.getElementById("callsignFilter");
const reloadBtn = document.getElementById("reloadBtn");

reloadBtn.addEventListener("click", () => loadAndRender());

// Load once map is ready
map.on("load", () => loadAndRender());

// -----------------------------
// Helpers
// -----------------------------
function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function parseLatLon(positionStr) {
  // positionStr is "lat,lon"
  if (!positionStr || typeof positionStr !== "string") return null;
  const parts = positionStr.split(",");
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lon, lat]; // GeoJSON is [lon, lat]
}

function downsample(coords, maxPoints) {
  if (coords.length <= maxPoints) return coords;
  const step = Math.ceil(coords.length / maxPoints);
  const out = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]);
  // ensure last point kept
  if (out[out.length - 1] !== coords[coords.length - 1]) out.push(coords[coords.length - 1]);
  return out;
}

function buildGeoJSONFromRows(rows) {
  // Group by uid, sort by timestamp, build LineString per flight
  const byUid = new Map();

  for (const r of rows) {
    const uid = r.uid;
    const coord = parseLatLon(r.position);
    if (!uid || !coord) continue;

    if (!byUid.has(uid)) byUid.set(uid, []);
    byUid.get(uid).push(r);
  }

  const features = [];

  for (const [uid, flightRows] of byUid.entries()) {
    flightRows.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let coords = [];
    for (const fr of flightRows) {
      const c = parseLatLon(fr.position);
      if (c) coords.push(c);
    }

    coords = downsample(coords, MAX_POINTS_PER_FLIGHT);
    if (coords.length < 2) continue;

    const first = flightRows[0];
    const props = {
      uid,
      callsign: first.callsign || "",
      origin: first.origin || "",
      destination: first.destination || "",
      airline: first.airline || "",
      flight_number: first.flight_number || "",
      scheduled: first.scheduled || null,
      journey_distance: first.journey_distance ?? null,
    };

    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: props,
    });
  }

  return { type: "FeatureCollection", features };
}

function fitToGeoJSON(fc) {
  if (!fc.features.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  for (const f of fc.features) {
    for (const c of f.geometry.coordinates) bounds.extend(c);
  }
  map.fitBounds(bounds, { padding: 60, duration: 800 });
}

function upsertRouteLayer(fc) {
  const sourceId = "routes";
  const layerId = "routes-line";

  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, { type: "geojson", data: fc });

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    paint: {
      "line-width": 2.5,
      "line-opacity": 0.85,
    },
  });

  map.on("click", layerId, (e) => {
    const f = e.features?.[0];
    if (!f) return;

    const p = f.properties || {};
    const html = `
      <div style="min-width:220px">
        <div style="font-weight:700;margin-bottom:6px">${p.callsign || "Flight"}</div>
        <div><b>UID:</b> ${p.uid || ""}</div>
        <div><b>Route:</b> ${(p.origin || "?")} → ${(p.destination || "?")}</div>
        <div><b>Airline:</b> ${p.airline || ""}</div>
        <div><b>Flight #:</b> ${p.flight_number || ""}</div>
        <div><b>Distance:</b> ${p.journey_distance ?? ""}</div>
      </div>
    `;

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });

  map.on("mouseenter", layerId, () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
}

// -----------------------------
// 4) Fetch from Supabase view + render
// -----------------------------
async function loadAndRender() {
  try {
    setStatus("Loading…");

    const daysBack = Number(daysBackEl.value || 7);
    const callsignText = (callsignEl.value || "").trim();

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - daysBack);
    const sinceIso = since.toISOString();

    // Build query
    let q = sb
      .from(VIEW_NAME)
      .select("uid,callsign,timestamp,position,origin,destination,airline,flight_number,scheduled,journey_distance")
      .gte("timestamp", sinceIso)
      .order("timestamp", { ascending: true })
      .limit(MAX_ROWS);

    if (callsignText) {
      // simple contains filter (ILIKE)
      q = q.ilike("callsign", `%${callsignText}%`);
    }

    const { data, error } = await q;

    if (error) throw error;

    const rows = data || [];
    setStatus(`Rows: ${rows.length}`);

    const fc = buildGeoJSONFromRows(rows);

    if (!fc.features.length) {
      setStatus(`No routes found (rows: ${rows.length}).`);
      // clear map if previously rendered
      if (map.getLayer("routes-line")) map.removeLayer("routes-line");
      if (map.getSource("routes")) map.removeSource("routes");
      return;
    }

    upsertRouteLayer(fc);
    fitToGeoJSON(fc);
    setStatus(`Flights: ${fc.features.length} | Points: ${rows.length}`);
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message || err}`);
    alert(`Failed to load routes: ${err.message || err}`);
  }
}
