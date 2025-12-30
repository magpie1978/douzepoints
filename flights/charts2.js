/* global Chart, sb */

// =====================================================
// GLOBAL STATE 
// =====================================================
let yearChart = null;
let airlineChart = null;
let baseStatsData = [];

// =====================================================
// LOAD BASE DATA
// =====================================================
async function loadStatsBaseData() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select(
      "year, journey_type, journey_distance, airline"
    );

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
// AGGREGATORS — RIGHT CHART
// =====================================================
function airlineTotals(data, metric) {
  const map = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      if (!map[r.airline]) map[r.airline] = 0;
      map[r.airline] += metric === "miles"
        ? (r.journey_distance || 0)
        : 1;
    });

  return Object.entries(map)
    .map(([airline, total]) => ({ airline, total }))
    .sort((a, b) => b.total - a.total);
}

// =====================================================
// LEFT CHART RENDERER
// =====================================================
function renderYearChart(values, label) {
  const canvas = document.getElementById("flightsByYearChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const years = Object.keys(values).sort();
  const data = years.map(y => Math.round(values[y]));

  if (yearChart) yearChart.destroy();

  yearChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        {
          data,
          backgroundColor: "rgba(201,162,77,0.7)",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            color: "#ccc",
            font: { size: 11 },
          },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#ccc",
            font: { size: 11 },
          },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    },
  });
}

// =====================================================
// RIGHT CHART RENDERER 
// =====================================================
function renderAirlineChart(data, metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const BAR_HEIGHT = 36;        // 👈 row height INCLUDING gap
  const VISIBLE_BARS = 20;      // 👈 bars visible before scroll

  // 🔑 Force canvas taller than container → enables scrolling
  canvas.height = data.length * BAR_HEIGHT;

  const labels = data.map(d => d.airline);
  const values = data.map(d => Math.round(d.total));

  if (window.airlineChart) window.airlineChart.destroy();

  window.airlineChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: "rgba(201,162,77,0.7)",
        borderRadius: 6,

        // ✅ Thickness + spacing
        barThickness: 22,
        maxBarThickness: 24,
        categoryPercentage: 0.8, // space per airline row
        barPercentage: 0.7,      // space filled by bar
      }],
    },
    options: {
      indexAxis: "y",
      responsive: false,        // 🔴 IMPORTANT: prevents auto-squash
      maintainAspectRatio: false,
      animation: false,

      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          callbacks: {
            label: ctx =>
              metric === "miles"
                ? `${ctx.raw.toLocaleString()} miles`
                : `${ctx.raw} flights`,
          },
        },
      },

      scales: {
        x: {
          ticks: {
            color: "#ccc",
            font: { size: 12 },
          },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: {
            color: "#ccc",
            font: { size: 12 },
          },
          grid: { display: false },
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
  renderYearChart(
    flightsPerYear(baseStatsData),
    "Flights"
  );

  // RIGHT DEFAULT
  renderAirlineChart(
    airlineTotals(baseStatsData, "flights"),
    "flights"
  );

  // LEFT DROPDOWN
  document
    .getElementById("metricSelector")
    .addEventListener("change", e => {
      const v = e.target.value;
      if (v === "miles") {
        renderYearChart(milesPerYear(baseStatsData), "Miles");
      } else {
        renderYearChart(flightsPerYear(baseStatsData), "Flights");
      }
    });

  // RIGHT DROPDOWN
  document
    .getElementById("airlineMetricSelector")
    .addEventListener("change", e => {
      const metric = e.target.value;
      renderAirlineChart(
        airlineTotals(baseStatsData, metric),
        metric
      );
    });
});
