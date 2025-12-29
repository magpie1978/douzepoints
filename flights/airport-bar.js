// =====================================================
// AIRPORT BAR HELPERS
// =====================================================
function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function getRouteDurationMinutes(r) {
  if (typeof r.journey_duration_seconds === "number") {
    return Math.round(r.journey_duration_seconds / 60);
  }
  return 0;
}

// =====================================================
// SHOW AIRPORT SUMMARY
// =====================================================
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
  const departures = flightRoutes.filter(
    r => r.origin_code === airportCode
  );

  const departureCountries = new Set(
    departures.map(r => r.destination_country).filter(Boolean)
  );

  // -------------------------
  // Arrivals (↘)
  // -------------------------
  const arrivals = flightRoutes.filter(
    r => r.destination_code === airportCode
  );

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
  // Total duration
  // -------------------------
  const totalMinutes = [...departures, ...arrivals].reduce(
    (sum, r) => sum + getRouteDurationMinutes(r),
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
    `${plural(departures.length, "flight")} to ${plural(departureCountries.size, "country")}`;

  document.getElementById("inboundFlights").textContent =
    `${plural(arrivals.length, "flight")} from ${plural(arrivalCountries.size, "country")}`;

  document.getElementById("airportAirlines").textContent =
    airlines.size;

  document.getElementById("airportDuration").textContent =
    `${hours}h ${minutes}m`;

  // Toggle bars
  document.getElementById("glassBar").style.display = "none";
  document.getElementById("airportSummaryBar").classList.remove("hidden");
}

// =====================================================
// HIDE AIRPORT SUMMARY
// =====================================================
function hideAirportSummary() {
  document.getElementById("airportSummaryBar").classList.add("hidden");
  document.getElementById("glassBar").style.display = "";
}

// =====================================================
// EXPOSE GLOBAL API
// =====================================================
window.showAirportSummary = showAirportSummary;
window.hideAirportSummary = hideAirportSummary;
