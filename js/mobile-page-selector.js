import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", initMobilePageSelector);

async function initMobilePageSelector() {
  const wrapper = document.querySelector(".mobile-page-selector");
  const label = document.getElementById("mobile-page-selector-label");
  const select = document.getElementById("mobile-page-select");

  if (!wrapper || !label || !select) return;

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  if (path.includes("country.html")) {
    await setupCountrySelector(label, select, params);
  }

  if (path.includes("edition.html")) {
    await setupEditionSelector(label, select, params);
  }
}

async function setupCountrySelector(label, select, params) {
  label.textContent = "Select country";

  const currentCountry = params.get("country") || "";

  const { data, error } = await supabase
    .from("douzepoints")
    .select("Country")
    .order("Country", { ascending: true });

  if (error || !data) {
    console.error("Could not load countries:", error);
    return;
  }

  const countries = [...new Set(data.map(row => row.Country).filter(Boolean))];

  select.innerHTML = countries.map(country => {
    const selected = country === currentCountry ? "selected" : "";
    return `<option value="${escapeHtml(country)}" ${selected}>${escapeHtml(country)}</option>`;
  }).join("");

  select.addEventListener("change", () => {
    const country = encodeURIComponent(select.value);
    window.location.href = `country.html?country=${country}`;
  });
}

async function setupEditionSelector(label, select, params) {
  label.textContent = "Select edition";

  const currentEdition = params.get("edition") || "";

  const { data, error } = await supabase
    .from("douzepoints")
    .select("Year")
    .order("Year", { ascending: false });

  if (error || !data) {
    console.error("Could not load editions:", error);
    return;
  }

  const years = [...new Set(data.map(row => row.Year).filter(Boolean))]
    .sort((a, b) => b - a);

  select.innerHTML = years.map(year => {
    const selected = String(year) === String(currentEdition) ? "selected" : "";
    return `<option value="${year}" ${selected}>Eurovision ${year}</option>`;
  }).join("");

  select.addEventListener("change", () => {
    window.location.href = `edition.html?edition=${select.value}`;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
