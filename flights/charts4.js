/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineChart = null;
let baseStatsData = [];

// 🔒 LOCK GLOBAL DEFAULT FONTS
Chart.defaults.font.family =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto";
Chart.defaults.font.size = 11;
Chart.defaults.font.weight = "400";
Chart.defaults.color = "#ccc";

// =====================================================
// LOAD BASE DATA
// =====================================================
async function loadStatsBaseData() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, journey_type, journey_distance, airline");

  if (error) {
    console.error("[stats] load failed", error);
    return [];
  }
  return data || [];
}

// =====================================================
// AGGREGATORS — LEFT CHART
// =====================================================
function flightsPerYear(data) {
  const out = {};
  data
    .filter(r => r.journey_type === "Flight")
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      out[y] = (out[y] || 0) + 1;
    });
  return out;
}

function milesPerYear(data) {
  const out = {};
  data
    .filter(r => r.journey_type === "Flight")
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      out[y] = (out[y] || 0) + (r.journey_distance || 0);
    });
  return out;
}

// =====================================================
// AGGREGATORS — RIGHT CHART (BY AIRLINE + YEAR)
// =====================================================
function aggregateAirlineByYear(data, metric) {
  const map = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      const value =
        metric === "miles" ? (r.journey_distance || 0) : 1;

      if (!map[r.airline]) map[r.airline] = {};
      map[r.airline][year] = (map[r.airline][year] || 0) + value;
    });

  const airlines = Object.entries(map).map(([airline, years]) => ({
    airline,
    years,
    total: Object.values(years).reduce((a, b) => a + b, 0),
  }));

  airlines.sort((a, b) => b.total - a.total);

  const allYears = Array.from(
    new Set(
      airlines.flatMap(a => Object.keys(a.years))
    )
  ).sort();

  return { airlines, years: allYears };
}

// =====================================================
// LEFT CHART RENDERER
// =====================================================
function renderYearChart(values) {
  const canvas = document.getElementById("flightsByYearChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = Object.keys(values).sort();
  const data = labels.map(y => Math.round(values[y]));

  if (yearChart) yearChart.destroy();

  yearChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: "rgba(201,162,77,0.7)",
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { size: 11 },
          bodyFont: { size: 11 },
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
// RIGHT CHART RENDERER (STACKED BY YEAR)
// =====================================================
function renderAirlineChart(data, metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  if (airlineChart) airlineChart.destroy();

  const ROW_HEIGHT = 38;
  const dpr = window.devicePixelRatio || 1;
  const cssHeight = data.airlines.length * ROW_HEIGHT;

  // CSS height enables scrolling
  canvas.style.width = "100%";
  canvas.style.height = `${cssHeight}px`;

  // HiDPI-safe canvas sizing
  canvas.width = canvas.parentElement.clientWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const labels = data.airlines.map(a => a.airline);

  const datasets = data.years.map(year => ({
    label: year,
    data: data.airlines.map(a =>
      Math.round(a.years[year] || 0)
    ),
    backgroundColor: "rgba(201,162,77,0.7)", // ✅ SAME COLOUR
    borderRadius: 6,
    barPercentage: 0.7,
    categoryPercentage: 0.8,
  }));

  airlineChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      indexAxis: "y",
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { size: 11 },
          bodyFont: { size: 11 },
          callbacks: {
            label: ctx =>
              metric === "miles"
                ? `${Number(ctx.raw).toLocaleString()} miles`
                : `${ctx.raw} flights`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { font: { size: 24 }, color: "#ccc" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          stacked: true,
          offset: true,
          ticks: {
            autoSkip: false,
            padding: 12,
            font: { size: 24 },
            color: "#ccc",
          },
          grid: { display: false },
        },
      },
    },
  });
}

// =====================================================
// INIT + DROPDOWNS
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  // LEFT DEFAULT
  renderYearChart(flightsPerYear(baseStatsData));

  // RIGHT DEFAULT
  renderAirlineChart(
    aggregateAirlineByYear(baseStatsData, "flights"),
    "flights"
  );

  // LEFT DROPDOWN
  document
    .getElementById("metricSelector")
    .addEventListener("change", e => {
      renderYearChart(
        e.target.value === "miles"
          ? milesPerYear(baseStatsData)
          : flightsPerYear(baseStatsData)
      );
    });

  // RIGHT DROPDOWN
  document
    .getElementById("airlineMetricSelector")
    .addEventListener("change", e => {
      const metric = e.target.value;
      renderAirlineChart(
        aggregateAirlineByYear(baseStatsData, metric),
        metric
      );
    });
});
