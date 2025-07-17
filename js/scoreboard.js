import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- Supabase Setup ---
const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzIiwi...';
if (!window.supabase) {
  window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabase;

// --- Global State ---
let allRawData = [];
let eurovisionData = [];
let currentYear = '2025';
let currentSortKey = null;
let currentSortDir = 'desc';

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

// --- Load and Render Table Data ---
async function loadTableData(year) {
  currentYear = year;
  const stage = document.getElementById("stageSelect").value;
  eurovisionData = await loadSupabaseDataForStageAndYear(stage, year);

  const header = document.getElementById("tableHeader");
  header.textContent = `Eurovision ${stage} - ${year}`;

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
      if (label === "Status" && isFinal) return '';

      const field = col.key || (isFinal ? col.final : col.semi);
      const hasField = field && row[field] != null && row[field] !== '';
      const dividerClass = (label === "R/O" || label === "Televote Rank" || label === "Jury Rank") ? "divider-right" : "";
      const alignClass =
        label === "Televote Pts" ? "televote-pts" :
        label === "Televote Rank" ? "televote-rank" :
        label === "Jury Pts" ? "jury-pts" :
        label === "Jury Rank" ? "jury-rank" :
        label === "Total Points" ? "total-pts" : "";

      if (label === "Country") {
        return `<td><span class="country-name">${flag}${row.Country}</span></td>`;
      }

      if (label === "Result" || label.includes("Rank")) {
        const val = row[field] || '';
        return `<td class="${alignClass} ${dividerClass}">${val}</td>`;
      }

      if (label === "Status") {
        const qualified = row["SemiFinal_Rank"] && row["Final_Rank"];
        const badge = qualified
          ? `<span class="badge qualified" title="Qualified for Final">Qual</span>`
          : `<span class="badge dnq">DNQ</span>`;
        return `<td>${badge}</td>`;
      }

      if (label === "") {
        const videoUrl = row.Video_URL || "";
        return `<td class="play-icon"><i data-url="${videoUrl}" class="video-trigger" data-feather="play-circle"></i></td>`;
      }

      return `<td class="${alignClass} ${dividerClass}">${hasField ? row[field] : ''}</td>`;
    });

    tr.innerHTML = cells.join('');
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
