/* global Chart, sb */

// =====================================================
// GLOBAL STATE
// =====================================================
let yearChart = null;
let airlineChart = null;
let baseStatsData = [];

// -----------------------------------------------------
// GLOBAL FONT LOCK (prevents distortion on redraw)
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
// RIGHT CHART AGGREGATOR (BY AIRLINE + YEAR)
// =====================================================
function airlineByYear(data, metric) {
  const map = {};

  data
    .filter(r => r.journey_type === "Flight" && r.airline)
    .forEach(r => {
      const year = String(r.year).slice(0, 4);
      map[r.airline] ??= {};
      map[r.airline][year] ??= 0;

      map[r.airline][year] +=
        metric === "miles" ? (r.journey_distance || 0) : 1;
    });

  const years = [...new Set(
    data.map(d => String(d.year).slice(0, 4))
  )].sort();

  const airlines = Object.entries(map)
    .map(([airline, values]) => ({
      airline,
      values,
      total: Object.values(values).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { years, airlines };
}

// =====================================================
// LEFT CHART RENDERER
// =====================================================
function renderYearChart(values) {
  const canvas = document.getElementById("flightsByYearChart");
  if (!canvas) return;

  if (yearChart) yearChart.destroy();

  yearChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: Object.keys(values).sort(),
      datasets: [{
        data: Object.keys(values).sort().map(y => Math.round(values[y])),
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
// RIGHT CHART RENDERER (FULL HEIGHT + SCROLL)
// =====================================================
function renderAirlineChart(data, metric) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  if (airlineChart) airlineChart.destroy();

  const { years, airlines } = airlineByYear(data, metric);

  const ROW_HEIGHT = 36;
  const dpr = window.devicePixelRatio || 1;
  const cssHeight = airlines.length * ROW_HEIGHT;

  canvas.style.width = "100%";
  canvas.style.height = `${cssHeight}px`;
  canvas.width = canvas.parentElement.clientWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  airlineChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: airlines.map(a => a.airline),
      datasets: years.map((year, i) => ({
        label: year,
        data: airlines.map(a => Math.round(a.values[year] || 0)),
        backgroundColor: "rgba(201,162,77,0.7)",
        borderColor: "rgba(255,215,128,0.25)", // subtle year separator
        borderWidth: 0.6,
        borderSkipped: false,
        barThickness: 22,
        maxBarThickness: 22,
        borderRadius:
          i === years.length - 1
            ? { topRight: 6, bottomRight: 6 }
            : 0,
        stack: "stack1",
      })),
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 450, easing: "easeOutQuart" },
      indexAxis: "y",
      interaction: { mode: "nearest", intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: ctx => {
            const t = ctx.tooltip;
            if (!t || !t.dataPoints?.length) return;

            const dp = t.dataPoints[0];
            const year = dp.dataset.label;
            const val = dp.raw;

            const el = document.getElementById("airline-tooltip")
              ?? Object.assign(document.body.appendChild(document.createElement("div")), {
                id: "airline-tooltip",
                style:
                  "position:fixed;background:#111;border:1px solid #444;padding:6px 10px;font-size:12px;color:#fff;border-radius:6px;pointer-events:none;z-index:1000;",
              });

            el.innerHTML = `<b>${year}</b>: ${Number(val).toLocaleString()} ${metric}`;
            el.style.left = `${t.caretX + 12}px`;
            el.style.top = `${t.caretY + 12}px`;
            el.style.opacity = 1;
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
          offset: true,
          ticks: {
            autoSkip: false,
            padding: 16,
            font: { size: 22 }, // ✅ airline labels
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

  document.getElementById("metricSelector")
    .addEventListener("change", e => {
      renderYearChart(
        e.target.value === "miles"
          ? milesPerYear(baseStatsData)
          : flightsPerYear(baseStatsData)
      );
    });

  document.getElementById("airlineMetricSelector")
    .addEventListener("change", e => {
      renderAirlineChart(baseStatsData, e.target.value);
    });
});
