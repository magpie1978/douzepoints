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

  const entries = [
    ...new Map(data.map(row => [row.Year, row])).values()
  ].sort((a, b) => b.Year - a.Year);

  const frag = document.createDocumentFragment();

  entries.forEach(row => {
    const link = document.createElement("a");

    link.className = "sidebar-item";
    link.href = `national-finals.html?country=${encodeURIComponent(country)}&year=${row.Year}`;
    //link.href = `national-finals.html?contest=${encodeURIComponent(country)}&year=${row.Year}`;

    link.innerHTML = `
      <img class="flag-icon" src="/flags/${row.country}.png">
      ${row.Contest} ${row.Year}
    `;

    frag.appendChild(link);
  });

  sidebar.appendChild(frag);
}
