// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineYearChart = null;
let baseStatsData = [];

// Keep your colour consistent across the page
const DP_YELLOW = "rgba(201,162,77,0.7)";
const DP_BORDER = "rgba(0,0,0,0.35)";

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
// AGGREGATORS (TOP-LEFT CHART)
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
    out[y] = (out[y] || 0) + (Number(r.journey_distance) || 0);
  });
  return out;
}

function airlinesPerYear(data) {
  const out = {};
  data.filter(r => r.journey_type === "Flight" && r.airline).forEach(r => {
    const y = String(r.year).slice(0, 4);
    if (!out[y]) out[y] = new Set();
    out[y].add(r.airline);
  });
  Object.keys(out).forEach(y => (out[y] = out[y].size));
  return out;
}

function countriesPerYear(data) {
  const out = {};
  data
    .filter(r => r.journey_type === "Flight" && r.destination_country)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      if (!out[y]) out[y] = new Set();
      out[y].add(r.destination_country);
    });
  Object.keys(out).forEach(y => (out[y] = out[y].size));
  return out;
}

// =====================================================
// AGGREGATOR (RIGHT CHART)
// =====================================================
function flightsPerAirlinePerYear(data) {
  const map = {};
  const yearsSet = new Set();

  data
    .filter(r => r.journey_type === "Flight" && r.airline && r.year)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      yearsSet.add(y);

      if (!map[r.airline]) map[r.airline] = {};
      map[r.airline][y] = (map[r.airline][y] || 0) + 1;
    });

  const years = [...yearsSet].sort();

  const totals = Object.entries(map).map(([airline, yearsObj]) => ({
    airline,
    total: Object.values(yearsObj).reduce((a, b) => a + b, 0),
    years: yearsObj,
  }));

  // show more than 10 so scroll is meaningful
  const top = totals.sort((a, b) => b.total - a.total).slice(0, 30);

  return { airlines: top, years };
}

// =====================================================
// TOTAL FLIGHTS LABEL PLUGIN (RIGHT CHART)
// Places total just AFTER the stacked bar end
// =====================================================
const airlineTotalsPlugin = {
  id: "airlineTotals",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    const totals = pluginOptions?.totals || [];
    if (!totals.length) return;

    // Use LAST dataset to get the "end" of the stacked bar
    const lastDatasetIndex = chart.data.datasets.length - 1;
    const meta = chart.getDatasetMeta(lastDatasetIndex);
    if (!meta?.data?.length) return;

    ctx.save();
    ctx.fillStyle = "#ddd";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, index) => {
      const total = totals[index];
      if (total == null) return;

      ctx.fillText(String(total), bar.x + 10, bar.y);
    });

    ctx.restore();
  },
};

// =====================================================
// RENDERER: TOP-LEFT
// =====================================================
function renderYearChart(values, label) {
  const canvas = document.getElementById("flightsByYearChart");
  const title = document.getElementById("chartTitle");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const years = Object.keys(values).sort();
  const data = years.map(y => Math.round(values[y]));

  title.textContent = `${label} by Year`;

  if (yearChart) yearChart.destroy();

  yearChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        {
          label,
          data,
          backgroundColor: DP_YELLOW,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { bottom: 18 } }, // ✅ prevents x labels clipping
      scales: {
        x: {
          ticks: { color: "#ccc" },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#ccc" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: t => {
              if (label === "Miles") return `${Number(t.raw).toLocaleString()} miles`;
              return `${t.raw} ${label.toLowerCase()}`;
            },
          },
        },
      },
    },
  });
}

// =====================================================
// RENDERER: RIGHT (AIRLINES)
// ✅ Makes canvas taller than container so scrollbar appears
// =====================================================
function renderAirlineYearChart(data) {
  const canvas = document.getElementById("airlineYearChart");
  const scrollEl = document.getElementById("airlineScroll");
  if (!canvas || !scrollEl) return;

  const ctx = canvas.getContext("2d");

  // ✅ Make canvas tall enough to overflow -> scrollbar appears
  const rowHeight = 42; // px per airline row
  const desiredHeight = Math.max(420, data.airlines.length * rowHeight);
  canvas.height = desiredHeight;
  canvas.style.height = `${desiredHeight}px`;
  canvas.style.width = "100%";

  const labels = data.airlines.map(a => a.airline);

  const datasets = data.years.map(year => ({
    label: year,
    data: data.airlines.map(a => a.years[year] || 0),
    backgroundColor: DP_YELLOW,
    borderWidth: 1,
    borderColor: DP_BORDER,
    borderRadius: 4,
  }));

  if (airlineYearChart) airlineYearChart.destroy();

  // IMPORTANT:
  // responsive:false so Chart.js respects the canvas height we set (so it can overflow & scroll)
  airlineYearChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      indexAxis: "y",
      responsive: false,           // ✅ don’t auto-shrink the canvas
      maintainAspectRatio: false,
      layout: { padding: { right: 28 } }, // room for totals text
      scales: {
        x: {
          stacked: true,
          ticks: { color: "#ccc" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          stacked: true,
          ticks: { color: "#ccc" },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: t => `${t.dataset.label}: ${t.raw} flights`,
          },
        },
        airlineTotals: {
          totals: data.airlines.map(a => a.total),
        },
      },
    },
    plugins: [airlineTotalsPlugin],
  });
}

// =====================================================
// INIT + DROPDOWN
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  renderYearChart(flightsPerYear(baseStatsData), "Flights");
  renderAirlineYearChart(flightsPerAirlinePerYear(baseStatsData));

  const selector = document.getElementById("metricSelector");
  if (!selector) return;

  selector.addEventListener("change", () => {
    if (selector.value === "miles") {
      renderYearChart(milesPerYear(baseStatsData), "Miles");
    } else if (selector.value === "airlines") {
      renderYearChart(airlinesPerYear(baseStatsData), "Airlines");
    } else if (selector.value === "countries") {
      renderYearChart(countriesPerYear(baseStatsData), "Countries");
    } else {
      renderYearChart(flightsPerYear(baseStatsData), "Flights");
    }
  });
});
