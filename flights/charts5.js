/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let baseStatsData = [];

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
    .select("year, journey_type, journey_distance");

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
      animation: { duration: 400, easing: "easeOutQuart" },
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
// INIT + DROPDOWNS (LEFT ONLY)
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  // Default: Flights per Year
  renderYearChart(flightsPerYear(baseStatsData));

  // Metric selector (Flights / Miles)
  document
    .getElementById("metricSelector")
    .addEventListener("change", e => {
      renderYearChart(
        e.target.value === "miles"
          ? milesPerYear(baseStatsData)
          : flightsPerYear(baseStatsData)
      );
    });
});
