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
     Andorra: "ad",
     Armenia: "am",
     Australia: "au",
     Austria: "at",
     Azerbaijan: "az",
     Belarus: "by",
     Belgium: "be",
     "Bosnia & Hercegovina": "ba",
     Bulgaria: "bg",
     Croatia: "hr",
     Cyprus: "cy",
     Czechia: "cz",
     Denmark: "dk",
     Estonia: "ee",
     Finland: "fi",
     France: "fr",
     Georgia: "ge",
     Germany: "de",
     Greece: "gr",
     Hungary: "hu",
     Iceland: "is",
     Ireland: "ie",
     Israel: "il",
     Italy: "it",
     Latvia: "lv",
     Lithuania: "lt",
     Luxembourg: "lu",
     Malta: "mt",
     Moldova: "md",
     Monaco: "mc",
     Montenegro: "me",
     Morocco: "mo",
     Netherlands: "nl",
     "North Macedonia": "mk",
     Norway: "no",
     Poland: "pl",
     Portugal: "pt",
     Romania: "ro",
     Russia: "ru",
     "San Marino": "sm",
     Serbia: "rs",
     "Serbia & Montenegro": "cs",
     Slovakia: "sk",
     Slovenia: "si",
     Spain: "es",
     Sweden: "se",
     Switzerland: "ch",
     Turkey: "tk",
     Ukraine: "ua",
     "United Kingdom": "gb",
     Yugoslavia: "yu"
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
