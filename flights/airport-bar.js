function getRouteDurationMinutes(r) {
  if (typeof r.journey_duration_seconds === "number") {
    return Math.round(r.journey_duration_seconds / 60);
  }
  return 0;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

outboundText.textContent =
  `${plural(departures.length, "flight")} to ${plural(departureCountries.size, "country")}`;

inboundText.textContent =
  `${plural(arrivals.length, "flight")} from ${plural(arrivalCountries.size, "country")}`;


function showAirportSummary(airport) {
  const airportCode = airport.code;

  const routes =
    Array.isArray(window.allRoutes) && window.allRoutes.length
      ? window.allRoutes
      : [];

  // Only flights
  const flightRoutes = routes.filter(r => r.journey_type === "Flight");

  // -------------------------
// Departures (↗)
// -------------------------
const departures = flightRoutes.filter(r => r.origin === airportCode);

const departureCountries = new Set(
  departures
    .map(r => r.destination_country)
    .filter(Boolean)
);

// -------------------------
// Arrivals (↘)
// -------------------------
const arrivals = flightRoutes.filter(r => r.destination === airportCode);

const arrivalCountries = new Set(
  arrivals
    .map(r => r.origin_country)
    .filter(Boolean)
);


  // -------------------------
  // Airlines (both directions)
  // -------------------------
  const airlines = new Set(
    [...departures, ...arrivals]
      .map(r => r.airline)
      .filter(Boolean)
  );

  // -------------------------
  // Total duration (minutes)
  // -------------------------
  const totalMinutes = [...departures, ...arrivals].reduce(
  (sum, r) => sum + getRouteDurationMinutes(r),
  0
);

const hours = Math.floor(totalMinutes / 60);
const minutes = totalMinutes % 60;

document.getElementById("airportDuration").textContent =
  `${hours}h ${minutes}m`;

  // -------------------------
  // Update UI
  // -------------------------
  document.getElementById("airportCode").textContent = airportCode;
  document.getElementById("airportName").textContent = airport.city || "";

  document.getElementById("outboundFlights").textContent =
    `${departures.length} flights`;
  document.getElementById("outboundCountries").textContent =
    departureCountries.size;

  document.getElementById("inboundFlights").textContent =
    `${arrivals.length} flights`;
  document.getElementById("inboundCountries").textContent =
    arrivalCountries.size;

  document.getElementById("airportAirlines").textContent =
    airlines.size;

  document.getElementById("airportDuration").textContent =
    `${hours}h ${minutes}m`;

  // Toggle bars
  document.getElementById("glassBar").style.display = "none";
  document.getElementById("airportSummaryBar").classList.remove("hidden");
}



window.showAirportSummary = showAirportSummary;
window.hideAirportSummary = hideAirportSummary;





map.on("click", "airports-circle", e => {
  const airport = e.features[0].properties;

  showAirportSummary({
    code: airport.airport_code,
    city: airport.city,
    outboundFlights: airport.outbound_flights,
    outboundCountries: airport.outbound_countries,
    inboundFlights: airport.inbound_flights,
    inboundCountries: airport.inbound_countries,
    airlines: airport.airlines,
    duration: airport.total_duration
  });
});








map.on("click", e => {
  if (!e.features?.length) {
    hideAirportSummary();
  }
});
