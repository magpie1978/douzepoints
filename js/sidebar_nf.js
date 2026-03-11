import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", loadSidebar);

async function loadSidebar() {

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Contest, Country, Year");

  if (error) {
    console.error("Sidebar load error:", error);
    return;
  }

  /* ------------------------------------------
     Create unique Contest + Year combinations
  ------------------------------------------ */

  const rows = [...new Set(
    data.map(r => `${r.Contest}|${r.Year}|${r.Country}`)
  )].map(v => {
    const [contest, year, country] = v.split("|");
    return { contest, year, country };
  });

  /* ------------------------------------------
     Sort newest first
  ------------------------------------------ */

  rows.sort((a,b)=>{

    if (a.contest === b.contest) {
      return b.year - a.year;
    }

    return a.contest.localeCompare(b.contest);

  });

  /* ------------------------------------------
     Render sidebar
  ------------------------------------------ */

  const frag = document.createDocumentFragment();

  rows.forEach(row => {

    const link = document.createElement("a");

    link.className = "sidebar-item";

    link.href =
      `national-finals.html?contest=${encodeURIComponent(row.contest)}&year=${row.year}`;

    link.innerHTML = `
      <img class="flag-icon" src="/flags/${row.country}.png">
      ${row.contest} ${row.year}
    `;

    frag.appendChild(link);

  });

  sidebar.appendChild(frag);

}
