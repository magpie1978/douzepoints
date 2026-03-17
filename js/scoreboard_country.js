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

  eurovisionData = data;

  buildCountryDropdown();
}

function buildCountryDropdown() {

  const countries = [...new Set(eurovisionData.map(r => r.Country))]
    .sort();

  const select = document.getElementById("countrySelect");

  countries.forEach(country => {

    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;

    select.appendChild(option);
  });

  renderTables(countries[0]);

  select.addEventListener("change", e => {
    renderTables(e.target.value);
  });
}

function renderTables(country) {

  const countryRows = eurovisionData
    .filter(r => r.Country === country)
    .sort((a,b)=> b.Year - a.Year);

  /* Semi-Final participants only */
  const semiRows = countryRows.filter(r =>
    Number(r.SemiFinal) === 1 || Number(r.SemiFinal) === 2
  );

  /* Final table = ALL entries */
  const finalRows = countryRows;

  renderSemiTable(semiRows);
  renderFinalTable(finalRows);
}


//function renderSemiTable(rows){

//  const body = document.getElementById("semiBody");
//  body.innerHTML = "";

//  rows.forEach(r => {

//    const tr = document.createElement("tr");

//    tr.innerHTML = `
//      <td>${r.Year}</td>
//      <td>${r.Artist}</td>
//      <td>${r.Song}</td>
//      <td>${r.SemiFinal}</td>
//      <td>${r.SemiFinal_Rank}</td>
//      <td>${r.SemiFinal_TotalPoints}</td>
//    `;

//    body.appendChild(tr);

//  });
//}



function renderSemiTable(rows){

  const body = document.getElementById("semiBody");
  body.innerHTML = "";

  rows.forEach(r => {

    
  const qualified =
    r.Final_Rank !== null &&
    r.Final_Rank !== undefined &&
    Number(r.Final_Rank) > 0;
      

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.Year}</td>
      <td>${r.Artist}</td>

      <td class="play-icon">
        <i data-lucide="play-circle"
           class="video-trigger"
           data-url="${r.Video_URL || ""}">
        </i>
      </td>

      <td>${r.Song}</td>
      <td>${r.SemiFinal}</td>
      <td>${r.SemiFinal_Rank || ""}</td>
      <td>${r.SemiFinal_TotalPoints || ""}</td>
      <td>${statusBadge}</td>
    `;

    body.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}



//function renderFinalTable(rows){

//  const body = document.getElementById("finalBody");
//  body.innerHTML = "";

//  rows.forEach(r => {

//    const tr = document.createElement("tr");

//    tr.innerHTML = `
//      <td>${r.Year}</td>
//      <td>${r.Artist}</td>
//      <td>${r.Song}</td>
//      <td>${r.Final_Rank}</td>
//      <td>${r.Final_TotalPoints}</td>
//    `;

//    body.appendChild(tr);

//  });
//}




function renderFinalTable(rows){

  const body = document.getElementById("finalBody");
  body.innerHTML = "";

  rows.forEach(r => {

    const qualified = r.Final_Rank !== null;

    const statusBadge = qualified
      ? ""
      : `<span class="badge dnq">DNQ</span>`;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.Year}</td>
      <td>${r.Artist}</td>

      <td class="play-icon">
        <i data-lucide="play-circle"
           class="video-trigger"
           data-url="${r.Video_URL || ""}">
        </i>
      </td>

      <td>${r.Song}</td>
      <td>${qualified ? r.Final_Rank : ""}</td>
      <td>${qualified ? r.Final_TotalPoints : ""}</td>
      <td>${qualified ? "" : `<span class="badge dnq">DNQ</span>`}</td>    `;

    body.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
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
