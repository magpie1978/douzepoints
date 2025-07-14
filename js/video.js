import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase initialization
const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

function renderEntry(entry) {
  const countryCode = entry.Country_Code?.toLowerCase();
  const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
  const flagUrl = `/flags/${countryCode}.png`;

  const div = document.createElement('div');
  div.className = 'video-item';
  div.setAttribute('data-year', entry.Year);
  div.setAttribute('data-artist', entry.Artist);
  div.setAttribute('data-song', entry.Song);
  div.setAttribute('data-country', entry.Country);
  div.setAttribute('data-jury', entry.Final_JuryPoints || "0");
  div.setAttribute('data-televote', entry.Final_TelevotePoints || "0");
  div.setAttribute('data-total', entry.Final_TotalPoints || "0");

  div.innerHTML = `
    <div class="preview-container">
      <img src="${imageUrl}" alt="${entry.Artist}" />
    </div>
    <div class="video-title-with-icon" onclick="event.stopPropagation()">
      <a href="country.html?country=${entry.Country}">
        <img class="flag-icon" src="${flagUrl}" alt="Flag">
      </a>
      <div class="video-title-text">
        <b>${entry.Artist}</b><br>${entry.Song}<br>${entry.Year}
      </div>
    </div>
  `;

  div.onclick = () => GDriveOpenModalWithVideo(entry.Video_URL);
  return div;
}

async function loadWinnersFromSupabase() {
  const { data, error } = await supabase
    .from('douzepoints')
    .select('*')
    .eq('Final_Rank', '1')
    .order('Year', { ascending: false });

  const container = document.getElementById('video-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = `<p style='padding: 20px;'>No winners found.</p>`;
    return;
  }

  container.innerHTML = '';
  data.forEach(entry => {
    const div = renderEntry(entry);
    container.appendChild(div);
  });

  document.getElementById("sort-options")?.dispatchEvent(new Event("change"));
}

async function loadFanFavoritesFromSupabase() {
  const { data, error } = await supabase
    .from('douzepoints')
    .select('*')
    .eq('FanFave', 'Y')
    .order('Year', { ascending: false });

  const container = document.getElementById('video-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = `<p style='padding: 20px;'>No fan favourites found.</p>`;
    return;
  }

  container.innerHTML = '';
  data.forEach(entry => {
    const div = renderEntry(entry);
    container.appendChild(div);
  });

  document.getElementById("sort-options")?.dispatchEvent(new Event("change"));
}

// Detect page and load appropriate content
document.addEventListener("DOMContentLoaded", () => {
  const isWinners = window.location.pathname.includes('winners.html');
  const isFanFaves = window.location.pathname.includes('fan-favorites.html');

  if (isWinners) {
    loadWinnersFromSupabase();
  } else if (isFanFaves) {
    loadFanFavoritesFromSupabase();
  }
});
