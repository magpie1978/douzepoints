// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineYearChart = null;
let baseStatsData = [];

// =====================================================
// LOAD BASE DATA
// =====================================================
async function loadStatsBaseData() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select(
      "year, journey_type, journey_distance, airline, destination_country"
    );

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
    out[y] = (out[y] || 0) + (r.journey_distance || 0);
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
// AGGREGATOR (TOP-RIGHT CHART)
// =====================================================
function flightsPerAirlinePerYear(data) {
  const map = {};
  const yearsSet = new Set();

  data.filter(r => r.journey_type === "Flight" && r.airline).forEach(r => {
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

  return {
    airlines: totals.sort((a, b) => b.total - a.total).slice(0, 20),
    years,
  };
}

// =====================================================
// TOTAL FLIGHTS LABEL PLUGIN (TOP-RIGHT)
// =====================================================
const airlineTotalsPlugin = {
  id: "airlineTotals",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;

    // Use LAST dataset to get bar end (stacked)
    const lastDatasetIndex = chart.data.datasets.length - 1;
    const meta = chart.getDatasetMeta(lastDatasetIndex);

    ctx.save();
    ctx.fillStyle = "#ddd";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, index) => {
      const total = pluginOptions.totals[index];
      if (!total) return;

      ctx.fillText(
        total,
        bar.x + 8, // ✅ just after bar end
        bar.y
      );
    });

    ctx.restore();
  },
};


// =====================================================
// RENDERER: TOP-LEFT (YEAR METRICS)
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
          backgroundColor: "rgba(201,162,77,0.7)",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            label: ctx =>
              label === "Miles"
                ? `${ctx.raw.toLocaleString()} miles`
                : `${ctx.raw} ${label.toLowerCase()}`,
          },
        },
      },
    },
  });
}

// =====================================================
// RENDERER: TOP-RIGHT (AIRLINES)
// =====================================================
function renderAirlineYearChart(data) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  // --------------------------------------------------
  // 🔑 FORCE CANVAS HEIGHT (ENABLE SCROLLING)
  // --------------------------------------------------
  const BAR_HEIGHT = 42; // px per airline (tweak if desired)
  const canvasHeight = data.airlines.length * BAR_HEIGHT;

  canvas.height = canvasHeight;
  canvas.style.height = `${canvasHeight}px`;

  // --------------------------------------------------
  // Chart setup
  // --------------------------------------------------
  const ctx = canvas.getContext("2d");
  const labels = data.airlines.map(a => a.airline);

  const datasets = data.years.map(year => ({
    label: year,
    data: data.airlines.map(a => a.years[year] || 0),
    backgroundColor: "rgba(201,162,77,0.7)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
    borderRadius: 4,
  }));

  if (airlineYearChart) airlineYearChart.destroy();

  airlineYearChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
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
            label: ctx =>
              `${ctx.dataset.label}: ${ctx.raw} flights`,
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
// INIT + DROPDOWN HANDLING
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  // Default top-left chart
  renderYearChart(flightsPerYear(baseStatsData), "Flights");

  // Top-right chart
  renderAirlineYearChart(
    flightsPerAirlinePerYear(baseStatsData)
  );

  const selector = document.getElementById("metricSelector");

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
