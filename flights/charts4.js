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
Chart.defaults.font.size = 12;
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
  (data || [])
    .filter(r => r.journey_type === "Flight" && r.year)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      out[y] = (out[y] || 0) + 1;
    });
  return out;
}

function milesPerYear(data) {
  const out = {};
  (data || [])
    .filter(r => r.journey_type === "Flight" && r.year)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      out[y] = (out[y] || 0) + (Number(r.journey_distance) || 0);
    });
  return out;
}

// =====================================================
// AGGREGATORS — RIGHT CHART (AIRLINE × YEAR)
// =====================================================
function aggregateAirlineByYear(data, metric) {
  const map = {};

  (data || [])
    .filter(r => r.journey_type === "Flight" && r.airline && r.year)
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      const value =
        metric === "miles" ? (Number(r.journey_distance) || 0) : 1;

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
    new Set(airlines.flatMap(a => Object.keys(a.years)))
  ).sort();

  return { airlines, years: allYears };
}

// =====================================================
// LEFT CHART RENDERER
// =====================================================
function renderYearChart(values, metricLabel) {
  const canvas = document.getElementById("flightsByYearChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = Object.keys(values || {}).sort();
  const data = labels.map(y => Math.round(values[y] || 0));

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
      animation: { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: "nearest",        // 👈 ensures segment-level detection
          intersect: true,        // 👈 only trigger on hovered segment
          titleFont: { size: 11 },
          bodyFont: { size: 11 },
        
          callbacks: {
            // Title = Year (dataset label)
            title: items => {
              if (!items.length) return "";
              return items[0].dataset.label;
            },
        
            // Body = value for THIS segment
            label: ctx => {
              const value = ctx.raw || 0;
        
              return metric === "miles"
                ? `${Number(value).toLocaleString()} miles`
                : `${value} flights`;
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
// TOTALS PLUGIN (RIGHT CHART)
// Draw totals just after the end of each stacked bar
// =====================================================
const airlineTotalsPlugin = {
  id: "airlineTotals",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    const totals = pluginOptions?.totals || [];
    const format = pluginOptions?.format || (v => v);

    const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
    if (!meta?.data?.length) return;

    ctx.save();
    ctx.fillStyle = "#ccc";
    ctx.font = "22px system-ui"; // as you requested
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, i) => {
      const total = totals[i];
      if (total == null) return;

      const rounded = typeof total === "number"
        ? Math.round(total)
        : total;

      ctx.fillText(
        String(format(rounded)),
        bar.x + 8,
        bar.y
      );
    });

    ctx.restore();
  },
};

// =====================================================
// RIGHT CHART RENDERER (STACKED BY YEAR + SCROLL CANVAS)
// =====================================================
function renderAirlineChart(grouped, metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  if (airlineChart) airlineChart.destroy();

  const ROW_HEIGHT = 38;
  const dpr = window.devicePixelRatio || 1;

  const airlines = grouped?.airlines || [];
  const years = grouped?.years || [];

  const cssHeight = Math.max(airlines.length * ROW_HEIGHT, 80);

  // CSS height enables scrolling in the parent container
  canvas.style.width = "100%";
  canvas.style.height = `${cssHeight}px`;

  // HiDPI-safe bitmap sizing
  const parentWidth = canvas.parentElement?.clientWidth || 600;
  canvas.width = parentWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const labels = airlines.map(a => a.airline);

const datasets = years.map((year, yearIndex) => {
  const isLast = yearIndex === years.length - 1;

  return {
    label: year,
    data: airlines.map(a => Math.round(a.years[year] || 0)),
    backgroundColor: "rgba(201,162,77,0.7)",
    borderColor: "rgba(201,162,77,0.28)",
    borderWidth: 1,

    // ✅ ONLY round the final stacked segment
    borderRadius: isLast
      ? { topRight: 10, bottomRight: 10 }
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

      // Animate transitions Flights <-> Miles
      animation: {
        duration: 550,
        easing: "easeOutQuart",
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { size: 24 },
          bodyFont: { size: 24 },
          callbacks: {
            // title = year
            title: items => items?.[0]?.dataset?.label || "",
            // label = value with units
            label: c =>
              metric === "miles"
                ? `${Number(c.raw).toLocaleString()} miles`
                : `${c.raw} flights`,
          },
        },

        // totals drawn at the end of each airline bar
        airlineTotals: {
          totals: airlines.map(a => a.total || 0),
          format: v =>
            metric === "miles"
              ? Number(v).toLocaleString()
              : String(Math.round(v)),
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
    plugins: [airlineTotalsPlugin],
  });
}

// =====================================================
// INIT + DROPDOWNS
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  // LEFT DEFAULT (Flights)
  renderYearChart(flightsPerYear(baseStatsData), "flights");

  // RIGHT DEFAULT (Flights by Airline by Year)
  renderAirlineChart(
    aggregateAirlineByYear(baseStatsData, "flights"),
    "flights"
  );

  // LEFT DROPDOWN
  const leftSelector = document.getElementById("metricSelector");
  if (leftSelector) {
    leftSelector.addEventListener("change", e => {
      const metric = e.target.value;
      renderYearChart(
        metric === "miles" ? milesPerYear(baseStatsData) : flightsPerYear(baseStatsData),
        metric
      );
    });
  }

  // RIGHT DROPDOWN
  const rightSelector = document.getElementById("airlineMetricSelector");
  if (rightSelector) {
    rightSelector.addEventListener("change", e => {
      const metric = e.target.value; // "flights" or "miles"
      renderAirlineChart(
        aggregateAirlineByYear(baseStatsData, metric),
        metric
      );
    });
  }
});
