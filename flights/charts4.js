/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineChart = null;
let baseStatsData = [];

// =====================================================
// GLOBAL FONT LOCK (CRITICAL)
// =====================================================
Chart.defaults.font.family =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto";
Chart.defaults.font.size = 11;
Chart.defaults.font.weight = "400";
Chart.defaults.color = "#ccc";

// =====================================================
// LOAD DATA
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
// LEFT CHART AGGREGATORS
// =====================================================
function flightsPerYear(rows) {
  const out = {};
  rows
    .filter(r => r.journey_type === "Flight")
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      out[y] = (out[y] || 0) + 1;
    });
  return out;
}

function milesPerYear(rows) {
  const out = {};
  rows
    .filter(r => r.journey_type === "Flight")
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      out[y] = (out[y] || 0) + (r.journey_distance || 0);
    });
  return out;
}

// =====================================================
// RIGHT CHART — GROUP BY AIRLINE + YEAR
// =====================================================
function groupByAirlineAndYear(rows, metric) {
  const map = {};

  rows
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      map[r.airline] ??= {};
      map[r.airline][year] ??= 0;

      map[r.airline][year] +=
        metric === "miles"
          ? (r.journey_distance || 0)
          : 1;
    });

  return map;
}

// =====================================================
// LEFT CHART RENDERER
// =====================================================
function renderYearChart(values) {
  const canvas = document.getElementById("flightsByYearChart");
  if (!canvas) return;

  if (yearChart) yearChart.destroy();

  const labels = Object.keys(values).sort();
  const data = labels.map(y => Math.round(values[y]));

  yearChart = new Chart(canvas.getContext("2d"), {
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
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.08)" } },
      },
    },
  });
}

// =====================================================
// RIGHT CHART RENDERER — STACKED BY YEAR
// =====================================================
function renderAirlineChart(rows, metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  if (airlineChart) airlineChart.destroy();

  const ROW_HEIGHT = 38;
  const dpr = window.devicePixelRatio || 1;

  // -------- DATA PREP --------
  const grouped = groupByAirlineAndYear(rows, metric);

  const airlines = Object.entries(grouped)
    .map(([airline, years]) => ({
      airline,
      years,
      total: Object.values(years).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const labels = airlines.map(a => a.airline);

  const years = [
    ...new Set(
      rows
        .filter(r => r.journey_type === "Flight")
        .map(r => String(r.year).slice(0, 4))
    ),
  ].sort((a, b) => a - b);

  // -------- CANVAS SIZING --------
  const cssHeight = labels.length * ROW_HEIGHT;
  canvas.style.height = `${cssHeight}px`;
  canvas.style.width = "100%";

  canvas.width = canvas.parentElement.clientWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // -------- DATASETS (ONE PER YEAR) --------
  const datasets = years.map((year, i) => {
    const isLast = i === years.length - 1;

    return {
      label: year,
      data: airlines.map(a => Math.round(a.years[year] || 0)),
      backgroundColor: "rgba(201,162,77,0.7)",
      borderSkipped: false,
      borderRadius: isLast
        ? { topRight: 6, bottomRight: 6 }
        : 0,
      barPercentage: 0.7,
      categoryPercentage: 0.8,
    };
  });

  // -------- TOTAL LABEL PLUGIN --------
  const totalsPlugin = {
    id: "airlineTotals",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.font = "22px system-ui";

      airlines.forEach((a, i) => {
        const meta = chart.getDatasetMeta(datasets.length - 1);
        const bar = meta.data[i];
        if (!bar) return;

        ctx.fillText(
          Math.round(a.total).toLocaleString(),
          bar.x + 8,
          bar.y + 6
        );
      });
      ctx.restore();
    },
  };

  // -------- CHART --------
  airlineChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    plugins: [totalsPlugin],
    options: {
      indexAxis: "y",
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: "easeOutCubic" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ${
                metric === "miles"
                  ? Math.round(ctx.raw).toLocaleString() + " miles"
                  : ctx.raw + " flights"
              }`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { font: { size: 11 } },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          stacked: true,
          ticks: {
            font: { size: 11 },
            autoSkip: false,
            padding: 10,
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

  renderYearChart(flightsPerYear(baseStatsData));
  renderAirlineChart(baseStatsData, "flights");

  document
    .getElementById("metricSelector")
    .addEventListener("change", e => {
      renderYearChart(
        e.target.value === "miles"
          ? milesPerYear(baseStatsData)
          : flightsPerYear(baseStatsData)
      );
    });

  document
    .getElementById("airlineMetricSelector")
    .addEventListener("change", e => {
      renderAirlineChart(baseStatsData, e.target.value);
    });
});
