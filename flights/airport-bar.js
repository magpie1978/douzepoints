/*function showAirportSummary(data) {
  document.getElementById("airportCode").textContent = data.code;
  document.getElementById("airportName").textContent = data.city;

  document.getElementById("outboundFlights").textContent =
    `${data.outboundFlights} flights`;
  document.getElementById("outboundCountries").textContent =
    data.outboundCountries;

  document.getElementById("inboundFlights").textContent =
    `${data.inboundFlights} flights`;
  document.getElementById("inboundCountries").textContent =
    data.inboundCountries;

  document.getElementById("airportAirlines").textContent =
    data.airlines;

  document.getElementById("airportDuration").textContent =
    data.duration;

  document.getElementById("glassBar").style.display = "none";
  document.getElementById("airportSummaryBar").classList.remove("hidden");
}

function hideAirportSummary() {
  document.getElementById("airportSummaryBar").classList.add("hidden");
  document.getElementById("glassBar").style.display = "";
}
*/

function showAirportSummary(airport) {
  const airportCode = airport.code;

  const routes =
    Array.isArray(window.allRoutes) && window.allRoutes.length
      ? window.allRoutes
      : [];

  // Only flights
  const flightRoutes = routes.filter(r => r.journey_type === "Flight");

  // -------------------------
  // Departures
  // -------------------------
  const departures = flightRoutes.filter(r => r.origin === airportCode);
  const departureCountries = new Set(
    departures.map(r => r.destination_country).filter(Boolean)
  );

  // -------------------------
  // Arrivals
  // -------------------------
  const arrivals = flightRoutes.filter(r => r.destination === airportCode);
  const arrivalCountries = new Set(
    arrivals.map(r => r.origin_country).filter(Boolean)
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
    (sum, r) => sum + (r.duration_minutes || 0),
    0
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

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
