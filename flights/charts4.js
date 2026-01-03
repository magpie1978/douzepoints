/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineChart = null;
let baseStatsData = [];

// 🔒 LOCK GLOBAL FONTS (prevents redraw distortion)
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
// LEFT CHART AGGREGATION
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
// RIGHT CHART AGGREGATION (AIRLINE + YEAR)
// =====================================================
function aggregateAirlineByYear(data, metric) {
  const map = {};
  const years = new Set();

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      years.add(year);

      if (!map[r.airline]) map[r.airline] = {};
      map[r.airline][year] =
        (map[r.airline][year] || 0) +
        (metric === "miles" ? (r.journey_distance || 0) : 1);
    });

  const yearList = Array.from(years).sort();

  const airlines = Object.entries(map)
    .map(([airline, ymap]) => {
      const total = yearList.reduce(
        (sum, y) => sum + (ymap[y] || 0),
        0
      );
      return { airline, years: ymap, total };
    })
    .sort((a, b) => b.total - a.total);

  return { airlines, years: yearList };
}

// =====================================================
// LEFT CHART RENDERER (HOVER TOOLTIP)
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
// RIGHT CHART RENDERER (CLICK TOOLTIP, STACKED)
// =====================================================
function renderAirlineChart(baseData, metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  if (airlineChart) {
    airlineChart.destroy();
    airlineChart = null;
  }

  const { airlines, years } = aggregateAirlineByYear(baseData, metric);

  const ROW_HEIGHT = 38;
  const dpr = window.devicePixelRatio || 1;
  const cssHeight = airlines.length * ROW_HEIGHT;

  canvas.style.height = `${cssHeight}px`;
  canvas.style.width = "100%";
  canvas.width = canvas.parentElement.clientWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const labels = airlines.map(a => a.airline);

  const datasets = years.map((year, i) => {
    const isLast = i === years.length - 1;

    return {
      label: year,
      data: airlines.map(a => Math.round(a.years[year] || 0)),
      backgroundColor: "rgba(201,162,77,0.7)",

      borderColor: "rgba(255,255,255,0.18)",
      borderWidth: i === 0 ? 0 : 1,
      borderSkipped: false,

      borderRadius: isLast
        ? { topRight: 12, bottomRight: 12 }
        : 0,

      barPercentage: 0.7,
      categoryPercentage: 0.8,
    };
  });

  airlineChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      indexAxis: "y",
      responsive: false,
      maintainAspectRatio: false,

      // 🔑 IMPORTANT: no hover interaction
      interaction: {
        mode: "nearest",
        intersect: false,
      },

      plugins: {
        legend: { display: false },

        // ❌ disable hover tooltips
        tooltip: {
          enabled: false,
          callbacks: {
            title: items => items[0].dataset.label,
            label: ctx =>
              metric === "miles"
                ? `${Math.round(ctx.raw).toLocaleString()} miles`
                : `${ctx.raw} flights`,
          },
        },
      },

      scales: {
        x: {
          stacked: true,
          ticks: { font: { size: 22 } },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
y: {
  stacked: true,
  offset: true,

  ticks: {
    autoSkip: false,          // 🔑 stop Chart.js shrinking text
    maxTicksLimit: Infinity,  // 🔑 force full-size labels
    padding: 18,

    font: {
      size: 22,               // 👈 airline labels at 22px
      lineHeight: 1.2,
      family:
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
      weight: "400",
    },

    color: "#ccc",
  },

  grid: {
    display: false,
  },
},

      },
    },
    plugins: [{
      id: "totals",
      afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        ctx.save();
        ctx.font = "22px system-ui";
        ctx.fillStyle = "#fff";

        airlines.forEach((a, i) => {
          const total = Math.round(a.total);
          const xPos = x.getPixelForValue(total) + 8;
          const yPos = y.getPixelForTick(i) + 4;
          ctx.fillText(total.toLocaleString(), xPos, yPos);
        });

        ctx.restore();
      },
    }],
  });

  // =====================================================
  // CLICK-TO-SHOW TOOLTIP (RELIABLE)
  // =====================================================
  canvas.onclick = evt => {
    const points = airlineChart.getElementsAtEventForMode(
      evt,
      "index",                // 🔑 row-based resolution
      { intersect: false },
      true
    );

    // Clear tooltip if clicking empty space
    if (!points.length) {
      airlineChart.tooltip.setActiveElements([], { x: 0, y: 0 });
      airlineChart.update();
      return;
    }

    const { datasetIndex, index } = points[0];

    // Correct positioning (handles DPR + scroll)
    const element = airlineChart.getDatasetMeta(datasetIndex).data[index];
    const pos = element.tooltipPosition();
    
    airlineChart.tooltip.setActiveElements(
      [{ datasetIndex, index }],
      pos
    );

    airlineChart.update();
  };
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
