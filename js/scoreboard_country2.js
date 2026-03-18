import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", loadPage);

async function loadPage() {
  const params = new URLSearchParams(window.location.search);
  const country = params.get("country");

  if (!country) return;

  const { data, error } = await supabase
    .from("douzepoints")
    .select("*")
    .ilike("Country", country)
    .order("Year", { ascending: false });

  if (error) {
    console.error("Load error:", error);
    return;
  }

  renderSemiFinalTable(data);
  renderFinalTable(data);
}

//////////////////////////////////////////////////////
// SEMI FINAL TABLE
//////////////////////////////////////////////////////

function renderSemiFinalTable(rows) {
  const table = document.getElementById("semi-table-body");
  if (!table) return;

  table.innerHTML = "";

  // Only semi-final entries
  const semiRows = rows.filter(r => r.SemiFinal);

  // ✅ Build Semi Size lookup (DISTINCT Video_Lookup)
  const semiSizes = {};

  rows.forEach(r => {
    if (!r.SemiFinal || !r.Video_Lookup) return;

    const key = `${r.Year}-${r.SemiFinal}`;

    if (!semiSizes[key]) semiSizes[key] = new Set();

    semiSizes[key].add(r.Video_Lookup);
  });

  semiRows.forEach(r => {

    // ❌ Skip rows with no rank
    if (!r.Rank) return;

    const key = `${r.Year}-${r.SemiFinal}`;
    const semiSize = semiSizes[key]?.size || 0;

    const qualified = r.Qualified === "Q";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.Year}</td>
      <td>${r.Artist || ""}</td>
      <td>${r.Song || ""}</td>

      <td>${r.Total_Points ?? "-"}</td>
      <td>${r.Rank ?? "-"}</td>

      <td>${badge(r.Qualified)}</td>

      <td>${r.Jury_Points ?? "-"}</td>
      <td>${r.Jury_Rank ?? "-"}</td>
      <td>${badge(r.Jury_Qualified)}</td>

      <td>${r.Televote_Points ?? "-"}</td>
      <td>${r.Televote_Rank ?? "-"}</td>
      <td>${badge(r.Televote_Qualified)}</td>

      <td>${semiSize}</td>
    `;

    table.appendChild(tr);
  });
}

//////////////////////////////////////////////////////
// FINAL TABLE
//////////////////////////////////////////////////////

function renderFinalTable(rows) {
  const table = document.getElementById("final-table-body");
  if (!table) return;

  table.innerHTML = "";

  const finalRows = rows.filter(r => !r.SemiFinal);

  finalRows.forEach(r => {

    const isDNQ = r.Qualified !== "Q";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.Year}</td>

      <td>${isDNQ ? "" : (r.Artist || "")}</td>
      <td>${isDNQ ? "" : (r.Song || "")}</td>

      <td>${isDNQ ? "" : (r.Total_Points ?? "-")}</td>
      <td>${isDNQ ? "" : (r.Rank ?? "-")}</td>

      <td>${isDNQ ? badge("DNQ") : badge("Q")}</td>
    `;

    table.appendChild(tr);
  });
}

//////////////////////////////////////////////////////
// BADGE RENDERER
//////////////////////////////////////////////////////

function badge(status) {
  if (!status) return "";

  const isQ = status === "Q";

  return `
    <span class="badge ${isQ ? "badge-q" : "badge-dnq"}">
      ${status}
    </span>
  `;
}
