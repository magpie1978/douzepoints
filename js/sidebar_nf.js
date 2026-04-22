import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", loadSidebar);

async function loadSidebar() {
  const sidebar = document.getElementById("sidebar-container");
  if (!sidebar) return;

  const params = new URLSearchParams(window.location.search);
  const country = params.get("country");

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Contest, country, Year")
    .eq("country", country);

  if (error) {
    console.error(error);
    return;
  }

  const countryToFlagCode = {
    Albania: "al",
    Armenia: "am",
    Australia: "au",
    Austria: "at",
    Belgium: "be",
    Bulgaria: "bg",
    Croatia: "hr",
    Denmark: "dk",
    Estonia: "ee",
    Finland: "fi",
    France: "fr",
    Germany: "de",
    Greece: "gr",
    Ireland: "ie",
    Italy: "it",
    Latvia: "lv",
    Lithuania: "lt",
    Luxembourg: "lu",
    Malta: "mt",
    Moldova: "md",
    Montenegro: "me",
    Norway: "no",
    Poland: "pl",
    Portugal: "pt",
    Romania: "ro",
    "San Marino": "sm",
    Serbia: "rs",
    Sweden: "se",
    Ukraine: "ua"
  };

  const entries = [
    ...new Map(data.map(row => [row.Year, row])).values()
  ].sort((a, b) => b.Year - a.Year);

  const frag = document.createDocumentFragment();

  entries.forEach(row => {
    const link = document.createElement("a");
    const flagCode = countryToFlagCode[row.country];

    link.className = "sidebar-item";
    link.href = `national-finals.html?country=${encodeURIComponent(country)}&year=${row.Year}`;

    link.innerHTML = `
      <img class="flag-icon" src="/flags/${flagCode}.png" alt="${row.country}">
      ${row.Contest} ${row.Year}
    `;

    frag.appendChild(link);
  });

  sidebar.appendChild(frag);
}
