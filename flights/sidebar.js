// =====================================================
// SIDEBAR
// =====================================================
function renderSidebar(routes) {
  if (!flightListEl) return;
  flightListEl.innerHTML = "";

  (routes || []).forEach(r => {
    const li = document.createElement("li");
    li.dataset.uid = r.uid;
    li.classList.toggle("active", r.uid === isolatedUid);

    const logoUrl = getAirlineLogo(r.airline);

  li.innerHTML = `
    <div class="date">${r.journey_date?.slice(0, 10) || ""}</div>
    <div class="route">
      ${logoUrl ? `<img class="airline-logo" src="${logoUrl}" />` : ""}
      <strong>${r.callsign || ""}</strong>
      ${r.origin || ""} → ${r.destination || ""}
    </div>
  `;

    li.addEventListener("click", () => toggleIsolation(r.uid));
    flightListEl.appendChild(li);
  });
}
