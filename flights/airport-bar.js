function showAirportSummary(data) {
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
