let allRawData = [];
let eurovisionData = [];
let currentYear = '2025';
let currentSortKey = null;
let currentSortDir = 'desc';

const columnDefinitions = [
  { label: "Result", final: "Final_Rank", semi: "SemiFinal_Rank" },
  { label: "Country", key: "Country" },
  { label: "Artist", key: "Artist" },
  { label: "Song", key: "Song" },
  { label: "", key: "PlayIcon" },
  { label: "R/O", final: "FinalRunningOrder", semi: "SemiFinalRunningOrder" },
  { label: "Televote Pts", final: "Final_TelevotePoints", semi: "SemiFinal_TelevotePoints" },
  { label: "Televote Rank", final: "Final_TelevoteRank", semi: "SemiFinal_TelevoteRank" },
  { label: "Jury Pts", final: "Final_JuryPoints", semi: "SemiFinal_JuryPoints" },
  { label: "Jury Rank", final: "Final_JuryRank", semi: "SemiFinal_JuryRank" },
  { label: "Total Points", final: "Final_TotalPoints", semi: "SemiFinal_TotalPoints" },
  { label: "Status", key: "Status" }
];

function formatOrdinal(n) {
  n = parseInt(n);
  if (isNaN(n)) return '-';
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function loadTableData(year) {
  currentYear = year;
  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";

  eurovisionData = allRawData.filter(row => {
    const matchYear = row.Year === year;
    if (isFinal) return matchYear && row.FinalRunningOrder;
    if (stage === "Semi Final 1") return matchYear && row.SemiFinal === "1";
    if (stage === "Semi Final 2") return matchYear && row.SemiFinal === "2";
    return false;
  });

  const header = document.getElementById("tableHeader");
  //header.textContent = `Eurovision ${isFinal ? "Grand Final" : stage} Entries (${year})`;

  const tableHead = document.getElementById("tableHead");
  tableHead.innerHTML = "<tr>" + columnDefinitions.map(col => {
    const field = col.key || (isFinal ? col.final : col.semi);
    if (col.label === "Status") return isFinal ? '' : `<th data-key="Status">Status</th>`;
    if (col.label === "") return `<th class="play-icon"></th>`;
    if (field && eurovisionData.some(row => row[field])) {
      const divider = (col.label === "R/O" || col.label === "Televote Rank" || col.label === "Jury Rank") ? 'divider-right' : '';
      return `<th class="${divider}" data-key="${col.label}">${col.label}</th>`;
    }
    return '';
  }).join('') + "</tr>";

  sortBy("Total Points", "desc");
}

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
        return `<td class="${dividerClass}">${flag}<span class="country-name">${row.Country}</span></td>`;
      }

      if (label === "Result" || label.includes("Rank")) {
        return hasField ? `<td class="${alignClass} ${dividerClass}">${formatOrdinal(row[field])}</td>` : '';
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
  return `<td class="play-icon"><i class="fas fa-play-circle" onclick="GDriveOpenModalWithVideo('${videoUrl.replace(/'/g, "\'")}')"></i></td>`;
}

      return hasField ? `<td class="${alignClass} ${dividerClass}">${row[field]}</td>` : '';
    });

    tr.innerHTML = cells.join('');
    tbody.appendChild(tr);
  });
}

function sortBy(displayLabel, direction = null) {
  const stage = document.getElementById("stageSelect").value;
  const isFinal = stage === "Final";

  const colDef = columnDefinitions.find(col => col.label === displayLabel);
  const field = colDef?.key || (isFinal ? colDef?.final : colDef?.semi);
  if (!field) return;

  const isNumeric = !isNaN(parseFloat(eurovisionData[0][field]));

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
    return aVal < bVal ? (currentSortDir === 'asc' ? -1 : 1) : aVal > bVal ? (currentSortDir === 'asc' ? 1 : -1) : 0;
  });

  document.querySelectorAll("th").forEach(th => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.key === displayLabel) {
      th.classList.add(currentSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  renderTable();
}

async function loadCSVData() {
  const response = await fetch('./data/DouzePoints.csv');
  const csvText = await response.text();
  return new Promise(resolve => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        allRawData = results.data;
        populateYearDropdown();
        loadTableData(currentYear);
        resolve();
      }
    });
  });
}

function populateYearDropdown() {
  const years = [...new Set(allRawData.map(row => row.Year).filter(Boolean))].sort((a, b) => b - a);
  const select = document.getElementById('yearSelect');
  select.innerHTML = '';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    select.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCSVData();

  document.getElementById("yearSelect").addEventListener("change", (e) => {
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
