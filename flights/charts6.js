/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineYearChart = null;
let baseStatsData = [];
let viewMode = "year"; // "year" | "alltime"

// =====================================================
// GLOBAL FONT LOCK
// =====================================================
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
    .select("year, journey_type, journey_distance, airline, destination_country");

  if (error) {
    console.error("[stats] load failed", error);
    return [];
  }
  return data || [];
}

// =====================================================
// YEAR NORMALISATION
// =====================================================
function yearKey(r) {
  if (!r?.year) return null;
  return String(r.year).slice(0, 4);
}

// =====================================================
// TOP-LEFT AGGREGATORS (PER YEAR)
// =====================================================
function flightsPerYear(data) {
  const out = {};
  data.filter(r => r.journey_type === "Flight").forEach(r => {
    const y = yearKey(r);
    if (!y) return;
    out[y] = (out[y] || 0) + 1;
  });
  return out;
}

function milesPerYear(data) {
  const out = {};
  data.filter(r => r.journey_type === "Flight").forEach(r => {
    const y = yearKey(r);
    if (!y) return;
    out[y] = (out[y] || 0) + (r.journey_distance || 0);
  });
  return out;
}

function airlinesPerYear(data) {
  const map = {};
  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;
      map[y] ??= new Set();
      map[y].add(r.airline);
    });

  return Object.fromEntries(
    Object.entries(map).map(([y, set]) => [y, set.size])
  );
}

function countriesPerYear(data) {
  const map = {};
  data
    .filter(r => r.journey_type === "Flight" && r.destination_country)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;
      map[y] ??= new Set();
      map[y].add(r.destination_country);
    });

  return Object.fromEntries(
    Object.entries(map).map(([y, set]) => [y, set.size])
  );
}

// =====================================================
// CUMULATIVE HELPERS (ALL TIME)
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

function cumulativeDistinctSets(perYearSets) {
  const seen = new Set();
  const out = {};
  Object.keys(perYearSets)
    .sort()
    .forEach(y => {
      perYearSets[y].forEach(v => seen.add(v));
      out[y] = seen.size;
    });
  return out;
}

// =====================================================
// TOP-LEFT RENDERER
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
      datasets: [{
        data,
        tension: 0.3,
        fill: false,
        backgroundColor: "rgba(201,162,77,0.7)",
        borderColor: "rgba(201,162,77,0.9)",
        borderWidth: isAllTime ? 3 : 0,
        pointRadius: isAllTime ? 3 : 0,
        borderRadius: isAllTime ? 0 : 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(255,255,255,0.08)" } },
      },
    },
  });
}

// =====================================================
// RIGHT-HAND AGGREGATORS
// =====================================================
function flightsPerAirlinePerYear(data) {
  const map = {};
  const totals = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;

      map[r.airline] ??= {};
      map[r.airline][y] = (map[r.airline][y] || 0) + 1;
      totals[r.airline] = (totals[r.airline] || 0) + 1;
    });

  return buildAirlineDatasets(map, totals);
}

function avgMilesPerAirlinePerYear(data) {
  const map = {};
  const totals = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = yearKey(r);
      if (!y) return;

      map[r.airline] ??= {};
      map[r.airline][y] ??= { sum: 0, count: 0 };

      map[r.airline][y].sum += (r.journey_distance || 0);
      map[r.airline][y].count += 1;

      totals[r.airline] = (totals[r.airline] || 0) + 1;
    });

  const normalised = {};
  Object.keys(map).forEach(a => {
    normalised[a] = {};
    Object.keys(map[a]).forEach(y => {
      normalised[a][y] =
        Math.round(map[a][y].sum / map[a][y].count);
    });
  });

  return buildAirlineDatasets(normalised, totals);
}

// =====================================================
// DATASET BUILDER (SHARED)
// =====================================================
function buildAirlineDatasets(map, totals) {
  const airlines = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([a]) => a);

  const years = [
    ...new Set(Object.values(map).flatMap(o => Object.keys(o))),
  ].sort();

  const datasets = years.map((year, idx) => ({
    label: year,
    data: airlines.map(a => map[a]?.[year] || 0),
    backgroundColor: "rgba(201,162,77,0.7)",
    borderRadius:
      idx === years.length - 1
        ? { topRight: 6, bottomRight: 6 }
        : 0,
    barPercentage: 0.75,
    categoryPercentage: 0.8,
  }));

  return { airlines, datasets };
}

// =====================================================
// RIGHT-HAND RENDERER (SCROLLABLE)
// =====================================================
function renderAirlineChart(data) {
  const canvas = document.getElementById("flightsPerAirlineYearChart");
  if (!canvas) return;

  const ROW_HEIGHT = 36;
  canvas.style.height = `${data.airlines.length * ROW_HEIGHT}px`;
  canvas.height = data.airlines.length * ROW_HEIGHT;

  const ctx = canvas.getContext("2d");

  if (airlineYearChart) airlineYearChart.destroy();

  airlineYearChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.airlines,
      datasets: data.datasets,
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      indexAxis: "y",
      animation: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, autoSkip: false },
      },
      plugins: { legend: { display: false } },
    },
  });
}

// =====================================================
// INIT + EVENTS
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  const metricSelect = document.getElementById("metricSelector");
  const airlineMetricSelect =
    document.getElementById("airlineMetricSelector");
  const btnYear = document.getElementById("btnYear");
  const btnAllTime = document.getElementById("btnAllTime");

  function refreshTop() {
    const metric = metricSelect.value;

    let values;
    switch (metric) {
      case "miles":
        values = milesPerYear(baseStatsData);
        break;
      case "airlines":
        values = airlinesPerYear(baseStatsData);
        break;
      case "countries":
        values = countriesPerYear(baseStatsData);
        break;
      default:
        values = flightsPerYear(baseStatsData);
    }

    if (viewMode === "alltime") values = cumulative(values);
    renderYearChart(values, metric);
  }

  function refreshRight() {
    renderAirlineChart(
      airlineMetricSelect.value === "average"
        ? avgMilesPerAirlinePerYear(baseStatsData)
        : flightsPerAirlinePerYear(baseStatsData)
    );
  }

  refreshTop();
  refreshRight();

  metricSelect.addEventListener("change", refreshTop);
  airlineMetricSelect.addEventListener("change", refreshRight);

  btnYear.addEventListener("click", () => {
    viewMode = "year";
    refreshTop();
  });

  btnAllTime.addEventListener("click", () => {
    viewMode = "alltime";
    refreshTop();
  });
});
