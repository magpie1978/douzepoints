/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let baseStatsData = [];
let viewMode = "year"; // "year" | "alltime"

// -----------------------------------------------------
// GLOBAL FONT LOCK
// -----------------------------------------------------
Chart.defaults.font.family =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto";
Chart.defaults.font.size = 12;
Chart.defaults.font.weight = "400";
Chart.defaults.color = "#ccc";

// =====================================================
// LOAD BASE DATA
// =====================================================
async function loadStatsBaseData() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select(
      "year, journey_type, journey_distance, airline, destination_country"
    );

  if (error) {
    console.error("[stats] load failed", error);
    return [];
  }

  return data || [];
}

// -----------------------------------------------------
// YEAR NORMALISATION HELPER
// -----------------------------------------------------
// Centralised helper to derive a consistent 4-digit year key
function yearKey(r) {
  if (!r?.year) return null;
  return String(r.year).slice(0, 4);
}

// =====================================================
// PER-YEAR AGGREGATORS
// =====================================================
function flightsPerYear(data) {
  const out = {};

  data
    .filter(r => r.journey_type === "Flight")
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;
      out[y] = (out[y] || 0) + 1;
    });

  return out;
}

function milesPerYear(data) {
  const out = {};

  data
    .filter(r => r.journey_type === "Flight")
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;
      out[y] = (out[y] || 0) + (r.journey_distance || 0);
    });

  return out;
}

function airlinesPerYearSets(data) {
  const map = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;
      map[y] ??= new Set();
      map[y].add(r.airline);
    });

  return map;
}

function cumulativeDistinctSets(perYearSets) {
  const seen = new Set();
  const out = {};

  Object.keys(perYearSets)
    .sort()
    .forEach(year => {
      perYearSets[year].forEach(v => seen.add(v));
      out[year] = seen.size;
    });

  return out;
}

function countriesPerYearSets(data) {
  const map = {};

  data
    .filter(r => r.journey_type === "Flight" && r.destination_country)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;
      map[y] ??= new Set();
      map[y].add(r.destination_country);
    });

  return map;
}

// =====================================================
// PER-YEAR → PER-AIRLINE (VERTICAL)
// =====================================================
function flightsPerYearPerAirline(data, topN = 8) {
  const map = {};
  const airlineTotals = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;

      map[y] ??= {};
      map[y][r.airline] = (map[y][r.airline] || 0) + 1;

      airlineTotals[r.airline] =
        (airlineTotals[r.airline] || 0) + 1;
    });

  const topAirlines = Object.entries(airlineTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([airline]) => airline);

  const years = Object.keys(map).sort();

  const datasets = topAirlines.map(airline => ({
    label: airline,
    data: years.map(y => map[y]?.[airline] || 0),
    backgroundColor: "rgba(201,162,77,0.7)",
    borderColor: "rgba(201,162,77,0.25)",
    borderWidth: 1,
    borderRadius: 4,
    barPercentage: 0.8,
    categoryPercentage: 0.8,
  }));

  return { years, datasets };
}

// =====================================================
// PER-AIRLINE → PER-YEAR (HORIZONTAL)
// =====================================================
function flightsPerAirlinePerYear(data) {
  const map = {};
  const airlineTotals = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;

      map[r.airline] ??= {};
      map[r.airline][y] = (map[r.airline][y] || 0) + 1;

      airlineTotals[r.airline] =
        (airlineTotals[r.airline] || 0) + 1;
    });

  const airlines = Object.entries(airlineTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([airline]) => airline);

  const years = [
    ...new Set(
      Object.values(map).flatMap(obj => Object.keys(obj))
    ),
  ].sort();

  const datasets = years.map(year => ({
    label: year,
    data: airlines.map(a => map[a]?.[year] || 0),
    backgroundColor: "rgba(201,162,77,0.7)",
    borderColor: "rgba(201,162,77,0.25)",
    borderWidth: 1,
    borderRadius:
      year === years[years.length - 1]
        ? { topRight: 6, bottomRight: 6 }
        : 0,
    barPercentage: 0.75,
    categoryPercentage: 0.8,
  }));

  return { airlines, years, datasets };
}

// =====================================================
// CUMULATIVE TRANSFORM
// =====================================================
function cumulative(valuesByYear) {
  let running = 0;
  const out = {};

  Object.keys(valuesByYear)
    .sort()
    .forEach(y => {
      running += valuesByYear[y];
      out[y] = running;
    });

  return out;
}

// =====================================================
// TOP-LEFT CHART RENDERER
// =====================================================
function renderYearChart(values, metric) {
  const canvas = document.getElementById("flightsByYearChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = Object.keys(values).sort();
  const data = labels.map(y => Math.round(values[y]));

  if (yearChart) yearChart.destroy();

  const isAllTime = viewMode === "alltime";

  yearChart = new Chart(ctx, {
    type: isAllTime ? "line" : "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          tension: 0.3,
          fill: false,
          backgroundColor: "rgba(201,162,77,0.7)",
          borderColor: "rgba(201,162,77,0.9)",
          borderWidth: isAllTime ? 3 : 0,
          pointRadius: isAllTime ? 3 : 0,
          borderRadius: isAllTime ? 0 : 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: "easeOutQuart" },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(255,255,255,0.08)" } },
      },
    },
  });
}
