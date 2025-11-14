import { supabase } from './supabaseClient.js';

let eurovisionData = [];
let currentYear = "2025";
let currentSortKey = null;
let currentSortDir = "desc";

const columnDefinitions = [
  { label: "Result", final: "Final_Rank", semi: "SemiFinal_Rank" },
  { label: "Country", key: "Country" },
  { label: "Artist", key: "Artist" },
  { label: "", key: "PlayIcon" },
  { label: "Song", key: "Song" },
  { label: "R/O", final: "FinalRunningOrder", semi: "SemiFinalRunningOrder" },
  { label: "Televote Pts", final: "Final_TelevotePoints", semi: "SemiFinal_TelevotePoints" },
  { label: "Televote Rank", final: "Final_TelevoteRank", semi: "SemiFinal_TelevoteRank" },
  { label: "Jury Pts", final: "Final_JuryPoints", semi: "SemiFinal_JuryPoints" },
  { label: "Jury Rank", final: "Final_JuryRank", semi: "SemiFinal_JuryRank" },
  { label: "Total Points", final: "Final_TotalPoints", semi: "SemiFinal_TotalPoints" },
  { label: "Status", key: "Status" }
];

/* ------------------------- LOAD DATA ------------------------- */
async function loadSupabaseData(stage, year) {
  let q = supabase.from("douzepoints").select("*").eq("Year", parseInt(year));

  if (stage === "Final") q = q.not("FinalRunningOrder", "is", null);
  if (stage === "Semi Final 1") q = q.eq("SemiFinal", "1");
  if (stage === "Semi Final 2") q = q.eq("SemiFinal", "2");

  const { data, error } = await q;
  if (error) return [];
  return data;
}

async function loadTableData(year) {
  currentYear = year;
  const stage = document.getElementById("stageSelect").value;
  eurovisionData = await loadSupabaseData(stage, year);

  document.getElementById("tableHeader").textContent =
    `Eurovision ${stage} - ${year}`;

  renderTableHead();
  renderTable();
  sortBy("Total Points", "desc");
}

/* ------------------------- TABLE HEAD ------------------------- */
function renderTableHead() {
  const thead = document.getElementById("tableHead");
  thead.innerHTML = "";

  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";

  const tr = document.createElement("tr");

  columnDefinitions.forEach(col => {
    if (isFinal && col.label === "Status") return; // HIDE STATUS IN FINAL

    const th = document.createElement("th");
    th.textContent = col.label;
    th.dataset.key = col.label;
    tr.appendChild(th);
  });

  thead.appendChild(tr);
}


/* ------------------------- TABLE BODY ------------------------- */
function renderTable() {
  const tbody = document.getElementById("eurovision-table-body");
  tbody.innerHTML = "";

  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";

  eurovisionData.forEach(row => {
    const tr = document.createElement("tr");

    const countryCode = row.Country_Code?.toLowerCase() || "";
    const flag = `<img class="flag" src="flags/${countryCode}.png">`;

    columnDefinitions.forEach(col => {
      if (isFinal && col.label === "Status") return; // HIDE STATUS IN FINAL

      const td = document.createElement("td");
      const field = col.key || (isFinal ? col.final : col.semi);

      if (col.label === "Country") {
        td.innerHTML = `${flag}${row.Country}`;
      }
      else if (col.label === "") {
        td.innerHTML = `<i data-url="${row.Video_URL}" class="video-trigger" data-feather="play-circle"></i>`;
      }
      else if (col.label === "Status") {
        const q = row["SemiFinal_Rank"] && row["Final_Rank"];
        td.innerHTML = q
          ? `<span class="badge qualified">Qual</span>`
          : `<span class="badge dnq">DNQ</span>`;
      }
      else {
        td.textContent = row[field] ?? "";
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  if (window.feather) feather.replace();
}

/* ------------------------- SORTING ------------------------- */
function sortBy(label, direction = null) {
  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";

  const col = columnDefinitions.find(c => c.label === label);
  const field = col.key || (isFinal ? col.final : col.semi);
  if (!field) return;

  const numeric = !isNaN(parseFloat(eurovisionData[0]?.[field]));

  if (currentSortKey === field && !direction) {
    currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
  } else {
    currentSortKey = field;
    currentSortDir = direction || (numeric ? "desc" : "asc");
  }

  eurovisionData.sort((a, b) => {
    const av = numeric ? +a[field] || 0 : (a[field] || "").toLowerCase();
    const bv = numeric ? +b[field] || 0 : (b[field] || "").toLowerCase();
    return currentSortDir === "asc" ? av - bv : bv - av;
  });

  renderTable();
}

/* ------------------------- INIT ------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabase.from("douzepoints").select("Year");
  const years = [...new Set(data.map(r => r.Year))].sort((a, b) => b - a);

  const select = document.getElementById("yearSelect");
  select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");

  await loadTableData(currentYear);

  select.addEventListener("change", e => loadTableData(e.target.value));
  document.getElementById("stageSelect").addEventListener("change", () => loadTableData(currentYear));

  document.addEventListener("click", e => {
    if (e.target.tagName === "TH") sortBy(e.target.dataset.key);
  });
});
