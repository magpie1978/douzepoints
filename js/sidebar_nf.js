import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", loadSidebar);

async function loadSidebar(){

  const sidebar = document.getElementById("sidebar-container");
  if (!sidebar) return;

  const params = new URLSearchParams(window.location.search);
  const country = params.get("contest");

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Contest, Country, Year")
    .eq("country", country);

  if (error) {
    console.error(error);
    return;
  }

  const years = [...new Set(data.map(r => r.Year))]
    .sort((a,b)=>b-a);

  const contestName = data[0]?.Contest || "";

  const frag = document.createDocumentFragment();

  years.forEach(year => {

    const link = document.createElement("a");

    link.className = "sidebar-item";

    link.href =
      `national-finals.html?contest=${country}&year=${year}`;

    link.textContent = `${contestName} ${year}`;

    frag.appendChild(link);

  });

  sidebar.appendChild(frag);

}
