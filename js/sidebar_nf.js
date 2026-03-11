import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", loadSidebar);

async function loadSidebar(){

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const params = new URLSearchParams(window.location.search);
  const contest = params.get("contest");

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Contest, Country, Year")
    .eq("Contest", contest);

  if (error) {
    console.error(error);
    return;
  }

  const years = [...new Set(data.map(r => r.Year))]
    .sort((a,b)=>b-a);

  const frag = document.createDocumentFragment();

  years.forEach(year => {

    const link = document.createElement("a");

    link.className = "sidebar-item";

    link.href =
      `national-finals.html?contest=${encodeURIComponent(contest)}&year=${year}`;

    link.textContent = `${contest} ${year}`;

    frag.appendChild(link);

  });

  sidebar.appendChild(frag);

}
