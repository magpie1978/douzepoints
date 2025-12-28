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
