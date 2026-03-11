import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {

  const sidebar = document.getElementById("sidebar-container");
  if (!sidebar) return;

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Year")
    .eq("Contest", "UMK");

  if (error) return;

  const uniqueYears = [...new Set(data.map(r => r.Year))]
    .sort((a, b) => b - a);

  uniqueYears.forEach(year => {

    const div = document.createElement("div");
    div.className = "sidebar-row";

    const a = document.createElement("a");
    a.href = `umk.html?edition=${year}`;

    const img = document.createElement("img");
    img.src = "/flags/fi.png";
    img.className = "flag-icon";

    a.appendChild(img);
    a.appendChild(document.createTextNode(`UMK ${year}`));

    div.appendChild(a);
    sidebar.appendChild(div);

  });

});
