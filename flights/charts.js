let flightsChart = null;

// =====================================================
// LOAD BASE DATA
// =====================================================
async function loadStatsBaseData() {
  if (typeof sb === "undefined") {
    console.error("[stats] Supabase client (sb) not found");
    return [];
  }

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
// METRIC BUILDERS
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

// =====================================================
// CHART RENDERER (TOP-LEFT PANEL ONLY)
// =====================================================
function renderFlightsByYearChart(values) {
  const canvas = document.getElementById("flightsByYearChart");
  if (!canvas) {
    console.error("[stats] flightsByYearChart canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  const years = Object.keys(values).sort();
  const data = years.map(y => values[y]);

  if (flightsChart) flightsChart.destroy();

  flightsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        {
          label: "Flights",
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
      },
    },
  });
}

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  const baseData = await loadStatsBaseData();
  const values = flightsPerYear(baseData);
  renderFlightsByYearChart(values);
});
