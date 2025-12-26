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



// =====================================================
// TAILFIN IMAGES
// =====================================================

//Base GitHub URL
const AIRLINE_LOGO_BASE = "https://raw.githubusercontent.com/magpie1978/douzepoints/main/tailfins/";

//Explicit airline → logo filename mappings
const airlineLogoMap = {
  "Ryanair": "Ryanair.webp",
  "British Airways": "BritishAirways.webp"
};


// =====================================================
// TAILFIN IMAGES HELPER
// =====================================================
function getAirlineLogo(airline) {
  if (!airline) return null;

  // 1️⃣ Explicit mapping (preferred)
  if (airlineLogoMap[airline]) {
    return AIRLINE_LOGO_BASE + airlineLogoMap[airline];
  }

  // 2️⃣ Fallback: auto-normalised filename
  const safe = airline
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  return AIRLINE_LOGO_BASE + safe + ".webp";
}
