import { supabase } from './supabaseClient.js';

let eurovisionData = [];

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

function buildCountryDropdown() {
  const countries = [...new Set(eurovisionData.map(r => r.Country))]
    .filter(Boolean)
    .sort();

  const select = document.getElementById("countrySelect");
  if (!select) return;

  select.innerHTML = "";

  countries.forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    select.appendChild(option);
  });

  if (countries.length > 0) {
    renderTables(countries[0]);
  }

  select.addEventListener("change", e => {
    renderTables(e.target.value);
  });
}

function renderTables(country) {
  const countryRows = eurovisionData
    .filter(r => r.Country === country)
    .sort((a, b) => Number(b.Year) - Number(a.Year));

  const semiRows = countryRows.filter(r =>
    r.SemiFinal_Rank !== null &&
    r.SemiFinal_Rank !== undefined &&
    r.SemiFinal_Rank !== ""
  );

  const finalRows = countryRows;

  renderSemiTable(semiRows);
  renderFinalTable(finalRows);
}

function badge(type) {
  if (type === "Q") {
    return `<span class="badge q">Q</span>`;
  }
  return `<span class="badge dnq">DNQ</span>`;
}

function renderRankCircle(rank, isQualified) {
  if (!rank) return "";
  return `
    <div class="rank-circle ${isQualified ? "rank-q" : "rank-dnq"}">
      ${rank}
    </div>
  `;
}

function buildSemiSizes(allRows) {
  const semiSizes = {};

  allRows.forEach(r => {
    if (
      r.SemiFinal === null ||
      r.SemiFinal === undefined ||
      r.SemiFinal === "" ||
      !r.Video_Lookup
    ) {
      return;
    }

    const key = `${r.Year}-${r.SemiFinal}`;

    if (!semiSizes[key]) {
      semiSizes[key] = new Set();
    }

    semiSizes[key].add(r.Video_Lookup);
  });

  return semiSizes;
}

function renderSemiTable(rows) {
  const body = document.getElementById("semiBody");
  if (!body) return;

  body.innerHTML = "";

  const semiSizes = buildSemiSizes(eurovisionData);

  rows.forEach(r => {
    const qualified =
      r.Final_Rank !== null &&
      r.Final_Rank !== undefined &&
      Number(r.Final_Rank) > 0;

    const juryQualified =
      r.SemiFinal_JuryRank !== null &&
      r.SemiFinal_JuryRank !== undefined &&
      r.SemiFinal_JuryRank !== "" &&
      Number(r.SemiFinal_JuryRank) <= 10;

    const televoteQualified =
      r.SemiFinal_TelevoteRank !== null &&
      r.SemiFinal_TelevoteRank !== undefined &&
      r.SemiFinal_TelevoteRank !== "" &&
      Number(r.SemiFinal_TelevoteRank) <= 10;

    const key = `${r.Year}-${r.SemiFinal}`;
    const semiSize = semiSizes[key]?.size || "";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.Year ?? ""}</td>
      <td>${r.Artist ?? ""}</td>

      <td class="play-icon">
        <i data-lucide="play-circle"
           class="video-trigger"
           data-url="${r.Video_URL || ""}">
        </i>
      </td>

      <td>${r.Song ?? ""}</td>
      <td>${r.SemiFinal_TotalPoints ?? ""}</td>
      <td>${renderRankCircle(r.SemiFinal_Rank, qualified)}</td>
      

      <td>${r.SemiFinal_JuryPoints ?? ""}</td>
      <td>${r.SemiFinal_JuryRank ?? ""}</td>
      <td>${juryQualified ? badge("Q") : badge("DNQ")}</td>

      <td>${r.SemiFinal_TelevotePoints ?? ""}</td>
      <td>${r.SemiFinal_TelevoteRank ?? ""}</td>
      <td>${televoteQualified ? badge("Q") : badge("DNQ")}</td>

      <td>${semiSize}</td>
    `;

    body.appendChild(tr);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderFinalTable(rows) {
  const body = document.getElementById("finalBody");
  if (!body) return;

  body.innerHTML = "";

  rows.forEach(r => {
    const qualified =
      r.Final_Rank !== null &&
      r.Final_Rank !== undefined &&
      r.Final_Rank !== "" &&
      Number(r.Final_Rank) > 0;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${qualified ? "" : `<span class="badge dnq">DNQ</span>`}</td>
      <td>${r.Year ?? ""}</td>

      <td class="play-icon">
        ${
          qualified
            ? `<i data-lucide="play-circle"
                 class="video-trigger"
                 data-url="${r.Video_URL || ""}">
               </i>`
            : ""
        }
      </td>

      <td>${qualified ? (r.Artist ?? "") : ""}</td>
      <td>${qualified ? (r.Song ?? "") : ""}</td>
      <td>${qualified ? (r.Final_Rank ?? "") : ""}</td>
      <td>${qualified ? (r.Final_TotalPoints ?? "") : ""}</td>
    `;

    body.appendChild(tr);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

document.addEventListener("click", e => {
  if (e.target.classList.contains("video-trigger")) {
    const url = e.target.getAttribute("data-url");
    if (window.openVideoModal) {
      window.openVideoModal(url);
    }
  }
});

loadData();
