import { supabase } from './supabaseClient.js';

let eurovisionData = [];

// ✅ MATCH scoreboard.js STYLE
const columnDefinitions = [
  { label: "Year", key: "Year" },
  { label: "Artist", key: "Artist" },
  { label: "Play", key: "PlayIcon" },
  { label: "Song", key: "Song" },
  { label: "Total Points", key: "SemiFinal_TotalPoints" },
  { label: "Rank", key: "SemiFinal_Rank" },
  { label: "Jury Points", key: "SemiFinal_JuryPoints" },
  { label: "Jury Rank", key: "SemiFinal_JuryRank" },
  { label: "Jury Qual", key: "JuryQual" },
  { label: "Televote Points", key: "SemiFinal_TelevotePoints" },
  { label: "Televote Rank", key: "SemiFinal_TelevoteRank" },
  { label: "Televote Qual", key: "TelevoteQual" },
  { label: "Semi Size", key: "SemiSize" }
];

async function loadData() {
  const { data, error } = await supabase
    .from('douzepoints')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  eurovisionData = data || [];
  buildCountryDropdown();
}

// --- DROPDOWN ---
function buildCountryDropdown() {
  const countries = [...new Set(eurovisionData.map(r => r.Country))]
    .filter(Boolean)
    .sort();

  const select = document.getElementById("countrySelect");
  select.innerHTML = "";

  countries.forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    select.appendChild(option);
  });

  renderTable(countries[0]);

  select.addEventListener("change", e => {
    renderTable(e.target.value);
  });
}

// --- BUILD HEADER (LIKE scoreboard.js) ---
function renderTableHead() {
  const thead = document.getElementById("semiHead");
  thead.innerHTML = "";

  const tr = document.createElement("tr");

  columnDefinitions.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col.label;
    tr.appendChild(th);
  });

  thead.appendChild(tr);
}

// --- BUILD DATA ---
function renderTable(country) {
  const rows = eurovisionData
    .filter(r => r.Country === country && r.SemiFinal_Rank)
    .sort((a, b) => Number(b.Year) - Number(a.Year));

  renderTableHead();

  const tbody = document.getElementById("semiBody");
  tbody.innerHTML = "";

  const semiSizes = buildSemiSizes(eurovisionData);

  rows.forEach(r => {
    const tr = document.createElement("tr");

    const juryQual = Number(r.SemiFinal_JuryRank) <= 10;
    const televoteQual = Number(r.SemiFinal_TelevoteRank) <= 10;

    const semiSize =
      semiSizes[`${r.Year}-${r.SemiFinal}`]?.size || "";

    const cells = columnDefinitions.map(col => {

      if (col.key === "PlayIcon") {
        return `
          <td class="play-icon">
            <i data-lucide="play-circle"
               class="video-trigger"
               data-url="${r.Video_URL || ""}">
            </i>
          </td>
        `;
      }

      if (col.key === "JuryQual") {
        return `<td>${badge(juryQual ? "Q" : "DNQ")}</td>`;
      }

      if (col.key === "TelevoteQual") {
        return `<td>${badge(televoteQual ? "Q" : "DNQ")}</td>`;
      }

      if (col.key === "SemiSize") {
        return `<td>${semiSize}</td>`;
      }

      return `<td>${r[col.key] ?? ""}</td>`;
    });

    tr.innerHTML = cells.join("");
    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

// --- HELPERS ---
function badge(type) {
  return type === "Q"
    ? `<span class="badge q">Q</span>`
    : `<span class="badge dnq">DNQ</span>`;
}

function buildSemiSizes(allRows) {
  const map = {};
  allRows.forEach(r => {
    if (!r.SemiFinal || !r.Video_Lookup) return;
    const key = `${r.Year}-${r.SemiFinal}`;
    if (!map[key]) map[key] = new Set();
    map[key].add(r.Video_Lookup);
  });
  return map;
}

// --- VIDEO MODAL ---
document.addEventListener("click", e => {
  if (e.target.classList.contains("video-trigger")) {
    const url = e.target.getAttribute("data-url");
    if (window.openVideoModal) {
      window.openVideoModal(url);
    }
  }
});

loadData();
