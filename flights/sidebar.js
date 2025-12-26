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
  <div class="sidebar-row">
    
    <!-- LEFT: LOGO -->
    <div class="sidebar-logo">
      ${logoUrl ? `
        <img
          class="airline-logo"
          src="${logoUrl}"
          alt="${r.airline}"
          width="100"
          height="100"
          onerror="this.style.display='none'"
        />
      ` : ""}
    </div>

    <!-- RIGHT: TEXT -->
    <div class="sidebar-text">
      <div class="sidebar-callsign">
        <strong>${r.callsign || ""}</strong>
      </div>

      <div class="sidebar-route">
        ${r.origin || ""} → ${r.destination || ""}
      </div>

      <div class="sidebar-date">
        ${r.journey_date?.slice(0, 10) || ""}
      </div>
    </div>

  </div>
`;

    /*
  li.innerHTML = `
    <div class="date">${r.journey_date?.slice(0, 10) || ""}</div>
    <div class="route">
      ${logoUrl ? `<img class="airline-logo" src="${logoUrl}" />` : ""}
      <strong>${r.callsign || ""}</strong>
      ${r.origin || ""} → ${r.destination || ""}
    </div>
  `;
*/
    li.addEventListener("click", () => toggleIsolation(r.uid));
    flightListEl.appendChild(li);
  });
}



// Airlines Slide Out Container
airlinesBox?.addEventListener("click", () => {
  if (!airlinesPanel) return;
  const isOpen = airlinesPanel.classList.contains("visible");
  if (isOpen) {
    airlinesPanel.classList.remove("visible");
    airlinesPanel.classList.add("hidden");
  } else {
    renderAirlinesPanel(currentRoutes);
    airlinesPanel.classList.remove("hidden");
    airlinesPanel.classList.add("visible");
  }
});



// Sidebar-aware padding
// Calculates map padding based on whether the sidebar is collapsed.
// Critical for correct fitBounds() behaviour.
function getSidebarLeftPad() {
  return sidebar?.classList.contains("collapsed")
    ? 80
    : (sidebar?.offsetWidth || 260) + 80;
}



function renderAirlinesPanel(routes) {
  if (!airlinesListEl) return;

  const airlines = [...new Set(
    routes.map(r => r.airline).filter(Boolean)
  )].sort();

  airlinesListEl.innerHTML = "";

  airlines.forEach(name => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img src="${getAirlineLogo(name)}" alt="${name}" />
      <span>${name}</span>
    `;
    airlinesListEl.appendChild(li);
  });
}
