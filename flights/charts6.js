/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let perYearAirlineChart = null;
let airlineByYearChart = null;

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
    .select("year, journey_type, journey_distance, airline, destination_country");

  if (error) {
    console.error("[stats] load failed", error);
    return [];
  }
  return data || [];
}

// =====================================================
// BASIC AGGREGATORS
// =====================================================
function flightsPerYear(data) {
  const out = {};
  data.filter(r => r.journey_type === "Flight").forEach(r => {
    const y = String(r.year).slice(0, 4);
    out[y] = (out[y] || 0) + 1;
  });
  return out;
}

function milesPerYear(data) {
  const out = {};
  data.filter(r => r.journey_type === "Flight").forEach(r => {
    const y = String(r.year).slice(0, 4);
    out[y] = (out[y] || 0) + (r.journey_distance || 0);
  });
  return out;
}

function airlinesPerYearSets(data) {
  const map = {};
  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      map[y] ??= new Set();
      map[y].add(r.airline);
    });
  return map;
}

function countriesPerYearSets(data) {
  const map = {};
  data
    .filter(r => r.journey_type === "Flight" && r.destination_country)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      map[y] ??= new Set();
      map[y].add(r.destination_country);
    });
  return map;
}

// =====================================================
// CUMULATIVE HELPERS
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
    .forEach(year => {
      perYearSets[year].forEach(v => seen.add(v));
      out[year] = seen.size;
    });
  return out;
}

// =====================================================
// LEFT CHART RENDERER
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
// BOTTOM LEFT — FLIGHTS PER YEAR PER AIRLINE
// =====================================================
function flightsPerYearPerAirline(data, topN = 8) {
  const map = {};
  const totals = {};

  data.filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      map[y] ??= {};
      map[y][r.airline] = (map[y][r.airline] || 0) + 1;
      totals[r.airline] = (totals[r.airline] || 0) + 1;
    });

  const topAirlines = Object.entries(totals)
    .sort((a,b) => b[1] - a[1])
    .slice(0, topN)
    .map(([a]) => a);

  const years = Object.keys(map).sort();

  const datasets = topAirlines.map(a => ({
    label: a,
    data: years.map(y => map[y]?.[a] || 0),
    backgroundColor: "rgba(201,162,77,0.7)",
  }));

  return { years, datasets };
}

function renderFlightsPerYearPerAirline(data) {
  const canvas = document.getElementById("flightsPerYearAirlineChart");
  if (!canvas) return;

  if (perYearAirlineChart) perYearAirlineChart.destroy();

  perYearAirlineChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels: data.years, datasets: data.datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true },
      },
      plugins: { legend: { position: "bottom" } },
    },
  });
}

// =====================================================
// RIGHT HAND — AIRLINE × YEAR (TOTAL / AVERAGE)
// =====================================================
function buildAirlineYearMap(data, mode) {
  const map = {};

  data.filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      map[r.airline] ??= {};
      map[r.airline][y] ??= { total: 0, count: 0 };

      map[r.airline][y].total += r.journey_distance || 0;
      map[r.airline][y].count += 1;
    });

  // Convert to totals or averages
  Object.keys(map).forEach(a => {
    Object.keys(map[a]).forEach(y => {
      const o = map[a][y];
      map[a][y] =
        mode === "average"
          ? o.total / o.count
          : o.count;
    });
  });

  return map;
}

function renderAirlineByYear(map) {
  const canvas = document.getElementById("flightsPerAirlineYearChart");
  if (!canvas) return;

  if (airlineByYearChart) airlineByYearChart.destroy();

  const airlines = Object.keys(map).sort(
    (a,b) =>
      Object.values(map[b]).reduce((x,y)=>x+y,0) -
      Object.values(map[a]).reduce((x,y)=>x+y,0)
  );

  const years = [...new Set(
    airlines.flatMap(a => Object.keys(map[a]))
  )].sort();

  const ROW_HEIGHT = 36;
  canvas.style.height = `${airlines.length * ROW_HEIGHT}px`;
  canvas.height = airlines.length * ROW_HEIGHT;

  const datasets = years.map((y, idx) => ({
    label: y,
    data: airlines.map(a => map[a][y] || 0),
    backgroundColor: "rgba(201,162,77,0.7)",
    borderRadius:
      idx === years.length - 1
        ? { topRight: 6, bottomRight: 6 }
        : 0,
  }));

  airlineByYearChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels: airlines, datasets },
    options: {
      indexAxis: "y",
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, ticks: { autoSkip: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ${Math.round(ctx.raw)}`
          },
        },
      },
    },
  });
}

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  // LEFT DEFAULT
  renderYearChart(flightsPerYear(baseStatsData), "flights");

  // BOTTOM LEFT
  renderFlightsPerYearPerAirline(
    flightsPerYearPerAirline(baseStatsData)
  );

  // RIGHT DEFAULT
  renderAirlineByYear(
    buildAirlineYearMap(baseStatsData, "total")
  );

  // LEFT CONTROLS
  document.getElementById("metricSelector").addEventListener("change", e => {
    const metric = e.target.value;

    if (metric === "miles")
      renderYearChart(milesPerYear(baseStatsData), metric);
    else if (metric === "airlines")
      renderYearChart(
        Object.fromEntries(
          Object.entries(airlinesPerYearSets(baseStatsData))
            .map(([y,s]) => [y,s.size])
        ),
        metric
      );
    else if (metric === "countries")
      renderYearChart(
        Object.fromEntries(
          Object.entries(countriesPerYearSets(baseStatsData))
            .map(([y,s]) => [y,s.size])
        ),
        metric
      );
    else
      renderYearChart(flightsPerYear(baseStatsData), metric);
  });

  // RIGHT DROPDOWN
  document.getElementById("rhsMetric").addEventListener("change", e => {
    renderAirlineByYear(
      buildAirlineYearMap(
        baseStatsData,
        e.target.value === "average" ? "average" : "total"
      )
    );
  });
});
