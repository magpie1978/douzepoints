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

  const semiRows = countryRows.filter(r => r.SemiFinal !== null);
  const finalRows = countryRows.filter(r => r.Final_Rank !== null);

  renderSemiTable(semiRows);
  renderFinalTable(finalRows);
}

function renderSemiTable(rows){

  const body = document.getElementById("semiBody");
  body.innerHTML = "";

  rows.forEach(r => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.Year}</td>
      <td>${r.Artist}</td>
      <td>${r.Song}</td>
      <td>${r.SemiFinal}</td>
      <td>${r.SemiFinal_Rank}</td>
      <td>${r.SemiFinal_TotalPoints}</td>
    `;

    body.appendChild(tr);

  });
}

function renderFinalTable(rows){

  const body = document.getElementById("finalBody");
  body.innerHTML = "";

  rows.forEach(r => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.Year}</td>
      <td>${r.Artist}</td>
      <td>${r.Song}</td>
      <td>${r.Final_Rank}</td>
      <td>${r.Final_TotalPoints}</td>
    `;

    body.appendChild(tr);

  });
}

loadData();
