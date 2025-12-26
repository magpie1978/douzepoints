// Counter aggregation
// Calculates and updates stats derived from the currently visible routes.
function updateAllCounters(routes) {
  
  // Journeys
  updateJourneyCounter(routes.length);

  // Miles
  const totalMiles = routes.reduce(
    (sum, r) => sum + (Number(r.journey_distance) || 0),
    0
  );
  updateMilesCounter(totalMiles);

  // Countries
  const countrySet = new Set(
    routes.map(r => r.destination_country).filter(Boolean)
  );
  updateCountriesCounter(countrySet.size);

  // Airlines
  const airlineSet = new Set(
    routes.map(r => r.airline).filter(Boolean)
  );
  updateAirlinesCounter(airlineSet.size);

  // Duration
  const totalSeconds = routes.reduce(
    (sum, r) => sum + (Number(r.journey_duration_seconds) || 0),
    0
  );
  updateDurationCounter(totalSeconds);
}
