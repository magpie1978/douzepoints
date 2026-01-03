/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineChart = null;
let baseStatsData = [];

// 👇 LOCK GLOBAL DEFAULT FONTS (IMPORTANT)
Chart.defaults.font.family = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto";
Chart.defaults.font.size = 12;
Chart.defaults.font.weight = "400";
Chart.defaults.color = "#ccc";


// =====================================================
// BAR VALUE LABEL PLUGIN (RIGHT-HAND CHART)
// =====================================================
const barValueLabelPlugin = {
  id: "barValueLabel",

  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.font = "24px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto";
    ctx.fillStyle = "#ccc";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, index) => {
      const value = dataset.data[index];
      if (value == null) return;

      const label =
        pluginOptions.metric === "miles"
          ? value.toLocaleString()
          : value.toString();

      ctx.fillText(label, bar.x + 8, bar.y);
    });

    ctx.restore();
  },
};


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
// AGGREGATORS — RIGHT CHART
// =====================================================
function airlineByYear(data, metric) {
  const map = {};
  const years = new Set();

  data
    .filter(r => r.journey_type === "Flight" && r.airline && r.year)
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      years.add(year);

      if (!map[r.airline]) map[r.airline] = {};
      map[r.airline][year] =
        (map[r.airline][year] || 0) +
        (metric === "miles" ? (r.journey_distance || 0) : 1);
    });

  const sortedYears = [...years].sort();

  const airlines = Object.entries(map)
    .map(([airline, yearsObj]) => ({
      airline,
      years: yearsObj,
      total: Object.values(yearsObj).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { airlines, years: sortedYears };
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
// RIGHT CHART RENDERER (SCROLLABLE, STABLE FONTS)
// =====================================================
function renderAirlineChart(grouped, metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  if (airlineChart) airlineChart.destroy();

  const ROW_HEIGHT = 38;
  const dpr = window.devicePixelRatio || 1;

  const cssHeight = grouped.airlines.length * ROW_HEIGHT;
  canvas.style.width = "100%";
  canvas.style.height = `${cssHeight}px`;

  const parentWidth = canvas.parentElement.clientWidth;
  canvas.width = parentWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const labels = grouped.airlines.map(a => a.airline);

  const datasets = grouped.years.map((year, i) => ({
    label: year,
    data: grouped.airlines.map(a => Math.round(a.years[year] || 0)),
    backgroundColor: yearTint("rgba(201,162,77,0.7)", i, grouped.years.length),
    borderRadius: {
      topLeft: 8,
      bottomLeft: 8,
      topRight: 8,
      bottomRight: 8,
    },
    borderSkipped: false,
    categoryPercentage: 0.8,
    barPercentage: 0.7,
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
        legend: { display: false }, // clean look
        tooltip: {
          titleFont: { size: 11 },
          bodyFont: { size: 11 },
          callbacks: {
            label: ctx =>
              metric === "miles"
                ? `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()} miles`
                : `${ctx.dataset.label}: ${ctx.raw} flights`,
          },
        },
      },

      scales: {
        x: {
          stacked: true,
          ticks: { font: { size: 11 }, color: "#ccc" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          stacked: true,
          offset: true,
          ticks: {
            autoSkip: false,
            padding: 12,
            font: { size: 11 },
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
    flightsPerAirline(baseStatsData),
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
  airlineByYear(baseStatsData, "flights"),
  "flights"
);

  });
});
