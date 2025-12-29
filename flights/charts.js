let yearChart = null;
let baseStatsData = [];

// =====================================================
// LOAD BASE DATA
// =====================================================
async function loadStatsBaseData() {
const { data, error } = await sb
  .from("journeys_routes_cache")
  .select("year, journey_type, journey_distance, airline, destination_country")

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

  function countriesPerYear(data) {
    const out = {};
  
    data
      .filter(r => r.journey_type === "Flight" && r.destination_country)
      .forEach(r => {
        const year = String(r.year).slice(0, 4);
  
        if (!out[year]) out[year] = new Set();
        out[year].add(r.destination_country);
      });
  
    // Convert Set sizes → numbers
    Object.keys(out).forEach(y => {
      out[y] = out[y].size;
    });
  
    return out;
  }

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
  
    const years = [...yearsSet].sort();
  
    // Total flights per airline
    const totals = Object.entries(map).map(([airline, yearsObj]) => ({
      airline,
      total: Object.values(yearsObj).reduce((a, b) => a + b, 0),
      years: yearsObj,
    }));
  
    // Top 10 airlines
    const top10 = totals
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  
    return { airlines: top10, years };
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
// CHART RENDERER
// =====================================================
let airlineYearChart = null;

function renderAirlineYearChart(data) {
  const canvas = document.getElementById("airlineYearChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const labels = data.airlines.map(a => a.airline);

  const datasets = data.years.map((year, i) => ({
    label: year,
    data: data.airlines.map(a => a.years[year] || 0),
    backgroundColor: `hsl(${210 + i * 18}, 65%, 55%)`,
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
        legend: {
          position: "bottom",
          labels: { color: "#ccc" },
        },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ${ctx.raw} flights`,
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

  // Existing chart
  renderYearChart(
    flightsPerYear(baseStatsData),
    "Flights"
  );

  // NEW airline chart
  const airlineData = flightsPerAirlinePerYear(baseStatsData);
  renderAirlineYearChart(airlineData);

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

