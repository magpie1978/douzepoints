let yearChart = null;
let baseStatsData = [];

// =====================================================
// LOAD BASE DATA
// =====================================================
async function loadStatsBaseData() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, journey_type, journey_distance");

  if (error) {
    console.error("[stats] load failed", error);
    return [];
  }

  return data || [];
}

// =====================================================
// AGGREGATORS
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
  
    // Convert sets → counts
    Object.keys(out).forEach(y => {
      out[y] = out[y].size;
    });
  
    return out;
  }


// =====================================================
// CHART RENDERER
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
                : `${ctx.raw} flights`,
          },
        },
      },
    },
  });
}

// =====================================================
// INIT + DROPDOWN HANDLING
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  baseStatsData = await loadStatsBaseData();

  // Default = Flights
  renderYearChart(
    flightsPerYear(baseStatsData),
    "Flights"
  );

  const selector = document.getElementById("metricSelector");

  selector.addEventListener("change", () => {
  if (selector.value === "miles") {
    renderYearChart(
      milesPerYear(baseStatsData),
      "Miles"
    );
  } else if (selector.value === "airlines") {
    renderYearChart(
      airlinesPerYear(baseStatsData),
      "Airlines"
    );
  } else {
    renderYearChart(
      flightsPerYear(baseStatsData),
      "Flights"
);
    }
  });
});
