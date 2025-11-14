import { supabase } from './supabaseClient.js';

// --- Global State ---
let allRawData = [];
let eurovisionData = [];
let currentYear = '2025';
let currentSortKey = null;
let currentSortDir = 'desc';

const columnDefinitions = [
  { label: "Play", key: "PlayIcon" },
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

// --- Load Supabase Data ---
async function loadSupabaseDataForStageAndYear(stage, year) {
  let query = supabase.from('douzepoints').select('*').eq('Year', parseInt(year));

  if (stage === 'Final') {
    query = query.not('FinalRunningOrder', 'is', null);
  } else if (stage === 'Semi Final 1') {
    query = query.eq('SemiFinal', '1');
  } else if (stage === 'Semi Final 2') {
    query = query.eq('SemiFinal', '2');
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error loading data:', error.message);
    return [];
  }
  return data;
}

// --- Render Table Head (TITLE ROW) ---
function renderTableHead() {
  const thead = document.getElementById('tableHead');
  thead.innerHTML = '';

  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";

  const tr = document.createElement('tr');

  columnDefinitions.forEach(col => {
    const label = col.label;

    // HIDE Status column completely when Final is selected
    if (isFinal && label === "Status") return;

    const th = document.createElement('th');
    th.textContent = label;
    th.dataset.key = label;
    tr.appendChild(th);
  });

  thead.appendChild(tr);
}

// --- Load and Render Table Data ---
async function loadTableData(year) {
  currentYear = year;
  const stage = document.getElementById("stageSelect").value;

  eurovisionData = await loadSupabaseDataForStageAndYear(stage, year);

  // NEW: Remove DNQs when "Final" is selected
  if (stage === "Final") {
    eurovisionData = eurovisionData.filter(r =>
      r.Final_Rank !== null &&
      r.Final_Rank !== "" &&
      r.Final_Rank !== undefined
    );
  }

  const header = document.getElementById("tableHeader");
  header.textContent = `Eurovision ${stage} - ${year}`;

  renderTableHead();
  renderTable();
  sortBy("Total Points", "desc");
}

// --- Render Table Rows ---
function renderTable() {
  const tbody = document.getElementById('eurovision-table-body');
  tbody.innerHTML = '';
  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";

  eurovisionData.forEach(row => {
    const tr = document.createElement('tr');
    const countryCode = (row.Country_Code || '').toLowerCase();
    const flag = `<img class="flag" src="flags/${countryCode}.png" alt="${row.Country} flag"/>`;

    const cells = columnDefinitions.map(col => {
      const label = col.label;

      // HIDE Status column completely when Final is selected
      if (isFinal && label === "Status") return null;

      const field = col.key || (isFinal ? col.final : col.semi);
      const hasField = field && row[field] != null && row[field] !== '';

      const dividerClass =
        (label === "R/O" || label === "Televote Rank" || label === "Jury Rank")
          ? "divider-right"
          : "";

      const alignClass =
        label === "Televote Pts" ? "televote-pts" :
        label === "Televote Rank" ? "televote-rank" :
        label === "Jury Pts" ? "jury-pts" :
        label === "Jury Rank" ? "jury-rank" :
        label === "Total Points" ? "total-pts" : "";

      // Country (flag + name)
      if (label === "Country") {
        return `<td><span class="country-name">${flag}${row.Country}</span></td>`;
      }

      // Result / Rank columns
      if (label === "Result" || label.includes("Rank")) {
        const val = row[field] || '';
        return `<td class="${alignClass} ${dividerClass}">${val}</td>`;
      }

      // Status (only for semis; Final is skipped above)
      if (label === "Status") {
        const qualified = row["SemiFinal_Rank"] && row["Final_Rank"];
        const badge = qualified
          ? `<span class="badge qualified" title="Qualified for Final">Qual</span>`
          : `<span class="badge dnq">DNQ</span>`;
        return `<td>${badge}</td>`;
      }

      // Play icon column
      if (label === "Play") {
    const videoUrl = row.Video_URL || "";
    return `
      <td class="play-icon">
        <i class="video-trigger" 
           data-url="${videoUrl}" 
           data-lucide="play-circle"
           style="cursor:pointer; color:#e50914; width:22px; height:22px;">
        </i>
      </td>
    `;
}


      // Default cells (Artist, Song, R/O, points, etc.)
      return `<td class="${alignClass} ${dividerClass}">${hasField ? row[field] : ''}</td>`;
    });

    // Remove nulls (i.e. removed Status cells in Final) before joining
    tr.innerHTML = cells.filter(cell => cell !== null).join('');
    tbody.appendChild(tr);
  });

  if (window.feather) feather.replace();
}

// --- Sorting Logic ---
function sortBy(displayLabel, direction = null) {
  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";
  const colDef = columnDefinitions.find(col => col.label === displayLabel);
  const field = colDef?.key || (isFinal ? colDef?.final : colDef?.semi);
  if (!field) return;

  const isNumeric = !isNaN(parseFloat(eurovisionData[0]?.[field]));

  if (currentSortKey === field && !direction) {
    currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortKey = field;
    const ascendingByDefault = [
      "FinalRunningOrder", "Final_TelevoteRank", "Final_JuryRank",
      "SemiFinalRunningOrder", "SemiFinal_TelevoteRank", "SemiFinal_JuryRank"
    ];
    currentSortDir = direction || (ascendingByDefault.includes(field) ? 'asc' : isNumeric ? 'desc' : 'asc');
  }

  eurovisionData.sort((a, b) => {
    const aVal = isNumeric ? parseFloat(a[field] || 0) : (a[field] || '').toLowerCase();
    const bVal = isNumeric ? parseFloat(b[field] || 0) : (b[field] || '').toLowerCase();
    if (aVal < bVal) return currentSortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return currentSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Update sort classes on visible headers only
  document.querySelectorAll("th").forEach(th => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.key === displayLabel) {
      th.classList.add(currentSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  renderTable();
}

// --- Initial Page Load ---
document.addEventListener("DOMContentLoaded", async () => {
  // Load distinct years
  const { data, error } = await supabase.from('douzepoints').select('Year');
  if (error) {
    console.error('Error loading years:', error.message);
    return;
  }

  const years = [...new Set(data.map(row => row.Year).filter(Boolean))].sort((a, b) => b - a);
  const select = document.getElementById('yearSelect');
  select.innerHTML = '';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year == currentYear) option.selected = true;
    select.appendChild(option);
  });

  await loadTableData(currentYear);

  document.getElementById("yearSelect").addEventListener("change", e => {
    loadTableData(e.target.value);
  });

  document.getElementById("stageSelect").addEventListener("change", () => {
    loadTableData(currentYear);
  });

  document.addEventListener("click", e => {
    if (e.target.tagName === "TH" && e.target.dataset.key) {
      sortBy(e.target.dataset.key);
    }
  });
});
