/* global Chart, sb */

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
    .select("year, journey_type, journey_distance, airline, destination_country");

  if (error) {
    console.error("[stats] load failed", error);
    return [];
  }

  return data || [];
}

// =====================================================
// TOP-LEFT AGGREGATORS
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
  data.filter(r => r.journey_type === "Flight" && r.destination_country).forEach(r => {
    const y = String(r.year).slice(0, 4);
    if (!out[y]) out[y] = new Set();
    out[y].add(r.destination_country);
  });
  Object.keys(out).forEach(y => (out[y] = out[y].size));
  return out;
}

// =====================================================
// RIGHT-HAND AGGREGATOR
// =====================================================
function perAirlinePerYear(data, metric) {
  const map = {};
  const yearsSet = new Set();

  data.filter(r => r.journey_type === "Flight" && r.airline).forEach(r => {
    const y = String(r.year).slice(0, 4);
    yearsSet.add(y);

    if (!map[r.airline]) map[r.airline] = {};
    map[r.airline][y] =
      (map[r.airline][y] || 0) +
      (metric === "miles" ? r.journey_distance || 0 : 1);
  });

  const years = [...yearsSet].sort();
  const airlines = Object.entries(map).map(([airline, yearsObj]) => ({
    airline,
    years: yearsObj,
    total: Object.values(yearsObj).reduce((a, b) => a + b, 0),
  }));

  airlines.sort((a, b) => b.total - a.total);

  return { years, airlines };
}

// =====================================================
// SCROLL + CANVAS SIZING (CRITICAL FIX)
// =====================================================
function sizeAirlineChart(canvas, airlineCount) {
  const ROW_HEIGHT = 34;
  const VISIBLE_ROWS = 20;

  const fullHeight = airlineCount * ROW_HEIGHT;
  const visibleHeight = VISIBLE_ROWS * ROW_HEIGHT;

  const wrapper = canvas.parentElement;
  if (wrapper) {
    wrapper.style.height = `${visibleHeight}px`;
    wrapper.style.maxHeight = `${visibleHeight}px`;
    wrapper.style.overflowY = "auto";
  }

  const dpr = window.devicePixelRatio || 1;
  const width = wrapper.clientWidth;

  canvas.style.width = "100%";
  canvas.style.height = `${fullHeight}px`;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(fullHeight * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// =====================================================
// TOTAL LABEL PLUGIN (POST-STACK)
// =====================================================
const airlineTotalsPlugin = {
  id: "airlineTotals",
  afterDatasetsDraw(chart, args, opts) {
    const { ctx, scales } = chart;
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.fillStyle = "#ddd";
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, i) => {
      const total = opts.totals[i];
      if (!total) return;

      const x = scales.x.getPixelForValue(total) + 8;
      ctx.fillText(
        opts.format === "miles"
          ? Math.round(total).toLocaleString()
          : Math.round(total),
        x,
        bar.y
      );
    });

    ctx.restore();
  },
};

// =====================================================
// TOP-LEFT CHART
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
    data: { labels: years, datasets: [{ data, backgroundColor: "rgba(201,162,77,0.7)", borderRadius: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#ccc" }, grid: { display: false } },
        y: { ticks: { color: "#ccc" }, grid: { color: "rgba(255,255,255,0.08)" } },
      },
    },
  });
}

// =====================================================
// RIGHT-HAND CHART
// =====================================================
function renderAirlineChart(metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  const { years, airlines } = perAirlinePerYear(baseStatsData, metric);
  sizeAirlineChart(canvas, airlines.length);

  const ctx = canvas.getContext("2d");

  const datasets = years.map(year => ({
    data: airlines.map(a => a.years[year] || 0),
    backgroundColor: "rgba(201,162,77,0.7)",
    barThickness: 22,
    borderRadius: 4,
  }));

  if (airlineYearChart) airlineYearChart.destroy();

  airlineYearChart = new Chart(ctx, {
    type: "bar",
    data: { labels: airlines.map(a => a.airline), datasets },
    options: {
      indexAxis: "y",
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, ticks: { color: "#ccc" }, grid: { color: "rgba(255,255,255,0.08)" } },
        y: { stacked: true, ticks: { color: "#ccc" }, grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        airlineTotals: { totals: airlines.map(a => a.total), format: metric },
      },
    },
    plugins: [airlineTotalsPlugin],
  });
}

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  renderYearChart(flightsPerYear(baseStatsData), "Flights");
  renderAirlineChart("flights");

  document.getElementById("metricSelector")?.addEventListener("change", e => {
    const v = e.target.value;
    if (v === "miles") renderYearChart(milesPerYear(baseStatsData), "Miles");
    else if (v === "airlines") renderYearChart(airlinesPerYear(baseStatsData), "Airlines");
    else if (v === "countries") renderYearChart(countriesPerYear(baseStatsData), "Countries");
    else renderYearChart(flightsPerYear(baseStatsData), "Flights");
  });

  document.getElementById("airlineMetricSelector")?.addEventListener("change", e => {
    renderAirlineChart(e.target.value);
  });
});
