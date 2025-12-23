let flightsChart = null;


async function loadFlightsByYear() {
  const { data, error } = await sb
    .from("journeys_routes_cache")
    .select("year, journey_type");

  if (error) {
    console.error("[stats] load failed", error);
    return {};
  }

  const counts = {};

  data
    .filter(r => r.journey_type === "Flight")
    .forEach(r => {
      const y = String(r.year).slice(0, 4);
      counts[y] = (counts[y] || 0) + 1;
    });

  return counts;
}


async function renderFlightsByYearChart() {
  const ctx = document
    .getElementById("flightsByYearChart")
    .getContext("2d");

  const counts = await loadFlightsByYear();

  const years = Object.keys(counts).sort();
  const values = years.map(y => counts[y]);

  if (flightsChart) flightsChart.destroy();

  flightsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        {
          label: "Flights",
          data: values,
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
          backgroundColor: "#111",
        },
      },
    },
  });
}


const statsBtn = document.getElementById("statsBtn");
const statsOverlay = document.getElementById("statsOverlay");
const statsCloseBtn = document.getElementById("statsCloseBtn");

statsBtn?.addEventListener("click", async () => {
  statsOverlay.classList.remove("hidden");
  await renderFlightsByYearChart();
});

statsCloseBtn?.addEventListener("click", () => {
  statsOverlay.classList.add("hidden");
});
