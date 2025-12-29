/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineYearChart = null;
let baseStatsData = [];

// Shared colours
const DP_YELLOW = "rgba(201,162,77,0.7)";
const DP_BORDER = "rgba(0,0,0,0.35)";


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
// AGGREGATORS — YEAR BASED
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

function airlinesPerYear(data) {
  const out = {};
  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      if (!out[y]) out[y] = new Set();
      out[y].add(r.airline);
    });

  Object.keys(out).forEach(y => {
    out[y] = out[y].size;
  });

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

  Object.keys(out).forEach(y => {
    out[y] = out[y].size;
  });

  return out;
}


// =====================================================
// AGGREGATORS — AIRLINE BASED
// =====================================================
function flightsPerAirlinePerYear(data) {
  const map = {};
  const yearsSet = new Set();

  data
    .filter(r => r.journey_type === "Flight" && r.airline && r.year)
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      yearsSet.add(year);

      if (!map[r.airline]) map[r.airline] = {};
      map[r.airline][year] = (map[r.airline][year] || 0) + 1;
    });

  return buildAirlineSeries(map, yearsSet);
}

function milesPerAirlinePerYear(data) {
  const map = {};
  const yearsSet = new Set();

  data
    .filter(
      r =>
        r.journey_type === "Flight" &&
        r.airline &&
        r.year &&
        r.journey_distance
    )
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      yearsSet.add(year);

      if (!map[r.airline]) map[r.airline] = {};
      map[r.airline][year] =
        (map[r.airline][year] || 0) + Number(r.journey_distance);
    });

  return buildAirlineSeries(map, yearsSet);
}

function buildAirlineSeries(map, yearsSet) {
  const years = [...yearsSet].sort();

  const totals = Object.entries(map).map(([airline, yearsObj]) => ({
    airline,
    total: Math.round(
      Object.values(yearsObj).reduce((a, b) => a + b, 0)
    ),
    years: yearsObj,
  }));

  const top = totals
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);

  return { airlines: top, years };
}


// =====================================================
// CHART — TOP LEFT (YEAR BASED)
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
          data,
          backgroundColor: DP_YELLOW,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
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
    },
  });
}


// =====================================================
// PLUGIN — TOTALS LABEL (AIRLINE CHART)
// =====================================================
const airlineTotalsPlugin = {
  id: "airlineTotals",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.fillStyle = "#ddd";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, index) => {
      const total = pluginOptions.totals[index];
      if (!total) return;

      ctx.fillText(total, bar.x + 8, bar.y);
    });

    ctx.restore();
  },
};


// =====================================================
// CHART — RIGHT (AIRLINES)
// =====================================================
function renderAirlineYearChart(data, mode = "flights") {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = data.airlines.map(a => a.airline);

  const datasets = data.years.map(year => ({
    label: year,
    data: data.airlines.map(a =>
      mode === "miles"
        ? Math.round(a.years[year] || 0)
        : a.years[year] || 0
    ),
    backgroundColor: DP_YELLOW,
    borderWidth: 1,
    borderColor: DP_BORDER,
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
            label: t =>
              mode === "miles"
                ? `${t.dataset.label}: ${t.raw.toLocaleString()} miles`
                : `${t.dataset.label}: ${t.raw} flights`,
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
// INIT + DROPDOWNS
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  // LEFT CHART
  renderYearChart(flightsPerYear(baseStatsData), "Flights");

  const metricSelector = document.getElementById("metricSelector");
  metricSelector.addEventListener("change", () => {
    if (metricSelector.value === "miles") {
      renderYearChart(milesPerYear(baseStatsData), "Miles");
    } else if (metricSelector.value === "airlines") {
      renderYearChart(airlinesPerYear(baseStatsData), "Airlines");
    } else if (metricSelector.value === "countries") {
      renderYearChart(countriesPerYear(baseStatsData), "Countries");
    } else {
      renderYearChart(flightsPerYear(baseStatsData), "Flights");
    }
  });

  // RIGHT CHART
  let airlineMode = "flights";
  const airlineSelector = document.getElementById("airlineMetricSelector");
  const airlineTitle = document.getElementById("airlineChartTitle");

  function updateAirlineChart() {
    if (airlineMode === "miles") {
      airlineTitle.textContent = "Miles per Airline by Year";
      renderAirlineYearChart(
        milesPerAirlinePerYear(baseStatsData),
        "miles"
      );
    } else {
      airlineTitle.textContent = "Flights per Airline by Year";
      renderAirlineYearChart(
        flightsPerAirlinePerYear(baseStatsData),
        "flights"
      );
    }
  }

  updateAirlineChart();

  airlineSelector.addEventListener("change", () => {
    airlineMode = airlineSelector.value;
    updateAirlineChart();
  });
});
