//import { supabase } from './supabaseClient.js';

//document.addEventListener("DOMContentLoaded", async () => {

//  const sidebar = document.getElementById("sidebar-container");
//  if (!sidebar) return;

//  const { data, error } = await supabase
//    .from("douzepoints_finland")
//    .select("Year")
//    .eq("Contest", "UMK");

//  if (error) return;

//  const uniqueYears = [...new Set(data.map(r => r.Year))]
//    .sort((a, b) => b - a);

//  uniqueYears.forEach(year => {

//    const div = document.createElement("div");
//    div.className = "sidebar-row";

//    const a = document.createElement("a");
//    a.href = `umk.html?edition=${year}`;

//    const img = document.createElement("img");
//    img.src = "/flags/fi.png";
//    img.className = "flag-icon";

//    a.appendChild(img);
//    a.appendChild(document.createTextNode(`UMK ${year}`));

//    div.appendChild(a);
//    sidebar.appendChild(div);

//  });

//});



import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {

  const sidebar = document.getElementById("sidebar-container");
  if (!sidebar) return;

  /* ---------------------------------- */
  /* Read contest from URL              */
  /* ---------------------------------- */

  const params = new URLSearchParams(window.location.search);
  const contest = params.get("contest") || "UMK";

  /* ---------------------------------- */
  /* Contest → flag mapping             */
  /* ---------------------------------- */

  const contestFlags = {
    "UMK": "fi",
    "Eesti Laul": "ee"
  };

  const flagCode = contestFlags[contest] || "eu";

  /* ---------------------------------- */
  /* Fetch years for this contest       */
  /* ---------------------------------- */

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Year")
    .eq("Contest", contest);

  if (error) {
    console.error("Sidebar load error:", error);
    return;
  }

  /* ---------------------------------- */
  /* Create unique year list            */
  /* ---------------------------------- */

  const uniqueYears = [...new Set(data.map(r => r.Year))]
    .sort((a,b) => b - a);

  /* ---------------------------------- */
  /* Build sidebar                      */
  /* ---------------------------------- */

  uniqueYears.forEach(year => {

    const div = document.createElement("div");
    div.className = "sidebar-row";

    const a = document.createElement("a");
    a.href =
      `national.html?contest=${encodeURIComponent(contest)}&year=${year}`;

    const img = document.createElement("img");
    img.src = `/flags/${flagCode}.png`;
    img.className = "flag-icon";

    a.appendChild(img);
    a.appendChild(document.createTextNode(`${contest} ${year}`));

    div.appendChild(a);
    sidebar.appendChild(div);

  });

});
