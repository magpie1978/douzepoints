/* import { supabase } from './supabaseClient.js';

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

*/





import { supabase } from "./supabaseClient.js";

// -------------------------------------------------------------
//  Dropdown Loading (Year + Stage)
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadYears();
  loadStageListener();
});

// Load all years available in the database
async function loadYears() {
  const yearSelect = document.getElementById("yearSelect");
  const stageSelect = document.getElementById("stageSelect");

  const { data, error } = await supabase
    .from("douzepoints")
    .select("Year")
    .order("Year", { ascending: false });

  if (error) {
    console.error("Error loading years", error);
    return;
  }

  const uniqueYears = [...new Set(data.map(x => x.Year))];

  // Populate the dropdown
  yearSelect.innerHTML = uniqueYears
    .map(yr => `<option value="${yr}">${yr}</option>`)
    .join("");

  // 🔥 IMPORTANT: force Stage dropdown to “Final”
  stageSelect.value = "Final";

  // 🔥 Now safely load the default scoreboard
  loadScoreboard(uniqueYears[0]);
}


// Attach listeners for Year + Stage changes
function loadStageListener() {
  const yearSelect = document.getElementById("yearSelect");
  const stageSelect = document.getElementById("stageSelect");

  yearSelect.addEventListener("change", () => {
    loadScoreboard(yearSelect.value);
  });

  stageSelect.addEventListener("change", () => {
    loadScoreboard(yearSelect.value);
  });
}

// -------------------------------------------------------------
//  Load Scoreboard (based on Year + Stage)
// -------------------------------------------------------------
async function loadScoreboard(selectedYear) {
  const stageSelect = document.getElementById("stageSelect");
  const stage = stageSelect.value;  // "Final" by default
  const tableHeader = document.getElementById("tableHeader");
  const tableHead = document.getElementById("tableHead");
  const tableBody = document.getElementById("eurovision-table-body");

  tableHeader.textContent = `Eurovision ${selectedYear} — ${stage}`;

  let query = supabase
    .from("douzepoints")
    .select("*")
    .eq("Year", selectedYear);

  // --------------------------------------------
  //  FINAL → Show ONLY songs that reached the final
  // --------------------------------------------
  if (stage === "Final") {
    query = query.eq("QualifiedFinal", "Y");
  }

  // --------------------------------------------
  //  SEMI FINAL 1 → Show ONLY Semi 1 participants
  // --------------------------------------------
  if (stage === "Semi Final 1") {
    query = query.eq("SemiFinal", "1");
  }

  // --------------------------------------------
  //  SEMI FINAL 2 → Show ONLY Semi 2 participants
  // --------------------------------------------
  if (stage === "Semi Final 2") {
    query = query.eq("SemiFinal", "2");
  }

  // --------------------------------------------
  //  ALWAYS order by Total Points (Final_TotalPoints) DESC
  // --------------------------------------------
  query = query.order("Final_TotalPoints", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error loading scoreboard:", error);
    return;
  }

  renderScoreboardTable(data, tableHead, tableBody);
}


// -------------------------------------------------------------
//  Render Scoreboard Table
// -------------------------------------------------------------
function renderScoreboardTable(entries, tableHead, tableBody) {
  if (!entries || entries.length === 0) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px;">No results</td></tr>`;
    return;
  }

  // --------------------------------------------
  // TABLE HEADERS
  // --------------------------------------------
  tableHead.innerHTML = `
  <tr>
    <th></th>
    <th>Artist</th>
    <th>Song</th>
    <th>Country</th>
    <th data-key="Televote Rank">Televote Rank</th>
    <th data-key="Televote Pts">Televote Pts</th>
    <th data-key="Jury Rank">Jury Rank</th>
    <th data-key="Jury Pts">Jury Pts</th>
    <th data-key="Total Points">Total Points</th>
    <th>Play</th>
  </tr>
`;

  // --------------------------------------------
  // TABLE BODY
  // --------------------------------------------
  tableBody.innerHTML = "";

  entries.forEach(entry => {
    const row = document.createElement("tr");

    const flag = entry.Country_Code?.toLowerCase() || "xx";
    const sf = entry.SemiFinal;
    const finalist = entry.QualifiedFinal === "Y";

    // FLAG CELL
    const flagCell = document.createElement("td");
    flagCell.innerHTML = `
      <img src="flags/${flag}.png" class="flag" alt="${entry.Country}" />
    `;
    row.appendChild(flagCell);

    // ARTIST
    const artistCell = document.createElement("td");
    artistCell.textContent = entry.Artist || "";
    row.appendChild(artistCell);

    // SONG
    const songCell = document.createElement("td");
    songCell.textContent = entry.Song || "";
    row.appendChild(songCell);

    // COUNTRY
    const countryCell = document.createElement("td");
    countryCell.textContent = entry.Country;
    row.appendChild(countryCell);

    // TELEVOTE RANK
    const tvRank = document.createElement("td");
    tvRank.classList.add("televote-rank");
    tvRank.textContent = entry.Final_TelevoteRank || "";
    row.appendChild(tvRank);

    // TELEVOTE PTS
    const tvPts = document.createElement("td");
    tvPts.classList.add("televote-pts");
    tvPts.textContent = entry.Final_TelevotePoints || "";
    row.appendChild(tvPts);

    // JURY RANK
    const juryRank = document.createElement("td");
    juryRank.classList.add("jury-rank");
    juryRank.textContent = entry.Final_JuryRank || "";
    row.appendChild(juryRank);

    // JURY POINTS
    const juryPts = document.createElement("td");
    juryPts.classList.add("jury-pts");
    juryPts.textContent = entry.Final_JuryPoints || "";
    row.appendChild(juryPts);

    // TOTAL POINTS
    const totalPts = document.createElement("td");
    totalPts.classList.add("total-pts");
    totalPts.textContent = entry.Final_TotalPoints || "";
    row.appendChild(totalPts);

    // PLAY ICON (NEW — unified modal trigger)
    const playCell = document.createElement("td");
    playCell.classList.add("play-icon");
    playCell.innerHTML = `
      <i data-lucide="play-circle" class="play-trigger" data-url="${entry.Video_URL}"></i>
    `;
    row.appendChild(playCell);

    tableBody.appendChild(row);
  });

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
}

// -------------------------------------------------------------
//  PLAY ICON CLICK HANDLER — unified with video.js
// -------------------------------------------------------------
document.addEventListener("click", (e) => {
  const icon = e.target.closest(".play-trigger");
  if (!icon) return;

  const videoUrl = icon.getAttribute("data-url");
  if (!videoUrl) return;

  if (typeof window.openVideoModal === "function") {
    window.openVideoModal(videoUrl);
  } else {
    console.error("openVideoModal() not found. Check modal.js and video.js");
  }
});

