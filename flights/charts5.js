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
    .select("year, journey_type, journey_distance, airline, destination_country");

  if (error) {
    console.error("[stats] load failed", error);
    return [];
  }
  return data || [];
}

// =====================================================
// AGGREGATORS — PER YEAR
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
      const y = String(r.year).slice(0, 4);
      map[y] ??= new Set();
      map[y].add(r.destination_country);
    });

  return map;
}


// =====================================================
// TRANSFORM → CUMULATIVE
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
// CHART RENDERER
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
      animation: { duration: 400, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.raw;
              if (metric === "miles") return `${v.toLocaleString()} miles`;
              return `${v.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: { font: { size: 11 } },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    },
  });
}

// =====================================================
// METRIC DISPATCH
// =====================================================
function getMetricValues(metric) {
  let yearly;

  switch (metric) {
    case "miles":
      yearly = milesPerYear(baseStatsData);
      return viewMode === "alltime"
        ? cumulative(yearly)
        : yearly;

    case "airlines": {
      const airlineSets = airlinesPerYearSets(baseStatsData);

      if (viewMode === "alltime") {
        return cumulativeDistinctSets(airlineSets);
      }

      // Year mode → size of set per year
      return Object.fromEntries(
        Object.entries(airlineSets).map(([y, set]) => [y, set.size])
      );
    }

    case "countries": {
      const countrySets = countriesPerYearSets(baseStatsData);

      if (viewMode === "alltime") {
        return cumulativeDistinctSets(countrySets);
      }

      return Object.fromEntries(
        Object.entries(countrySets).map(([y, set]) => [y, set.size])
      );
    }

    default:
      yearly = flightsPerYear(baseStatsData);
      return viewMode === "alltime"
        ? cumulative(yearly)
        : yearly;
  }
}


// =====================================================
// INIT + EVENTS
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  const metricSelect = document.getElementById("metricSelector");
  const btnYear = document.getElementById("btnYear");
  const btnAllTime = document.getElementById("btnAllTime");

  function refresh() {
    renderYearChart(
      getMetricValues(metricSelect.value),
      metricSelect.value
    );
  }

  // Defaults
  refresh();

  metricSelect.addEventListener("change", refresh);

  btnYear.addEventListener("click", () => {
    viewMode = "year";
    btnYear.classList.add("active");
    btnAllTime.classList.remove("active");
    refresh();
  });

  btnAllTime.addEventListener("click", () => {
    viewMode = "alltime";
    btnAllTime.classList.add("active");
    btnYear.classList.remove("active");
    refresh();
  });
});
