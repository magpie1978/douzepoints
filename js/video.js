import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';

// Make Supabase globally available
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

async function loadWinnersFromSupabase() {
  const container = document.getElementById('video-container');

  const { data, error } = await supabase
    .from('douzepoints')
    .select('*')
    .eq('Final_Rank', '1')
    .order('Year', { ascending: false });

  if (error) {
    container.innerHTML = `<p style='padding: 20px;'>Error loading winners: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p style='padding: 20px;'>No winners found.</p>`;
    return;
  }

  container.innerHTML = '';

  data.forEach(entry => {
    const videoDiv = document.createElement('div');
    videoDiv.className = 'video-item';
    videoDiv.setAttribute('data-country', entry.Country);
    videoDiv.setAttribute('data-artist', entry.Artist);
    videoDiv.setAttribute('data-song', entry.Song);
    videoDiv.setAttribute('data-year', entry.Year);
    videoDiv.setAttribute('data-jury', entry.Final_JuryPoints || "0");
    videoDiv.setAttribute('data-televote', entry.Final_TelevotePoints || "0");
    videoDiv.setAttribute('data-total', entry.Final_TotalPoints || "0");

    const videoUrl = entry.Video_URL;
    const imageUrl = entry.Image || `images/${entry.Year}-${entry.Country_Code}.jpeg`;
    const flagUrl = `flags/${entry.Country_Code?.toLowerCase()}.png`;

    videoDiv.addEventListener('click', () => {
      GDriveOpenModalWithVideo(videoUrl);
    });

    videoDiv.innerHTML = `
      <div class="preview-container">
        <img alt="${entry.Country} ${entry.Year}" src="${imageUrl}" />
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

    container.appendChild(videoDiv);
  });

  document.getElementById("sort-options").dispatchEvent(new Event("change"));
}

loadWinnersFromSupabase();


//import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

//    const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
//    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';

    // Make Supabase globally available
   // window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    window.loadFanFavoritesFromSupabase = async function () {
      const { data, error } = await window.supabase
        .from('douzepoints')
        .select('*')
        .eq('FanFave', 'Y')
        .order('Year', { ascending: false });

      const container = document.getElementById('video-container');
      if (error || !data || data.length === 0) {
        container.innerHTML = `<p style='padding: 20px; color: #ccc;'>No fan favourites found.</p>`;
        return;
      }

      container.innerHTML = '';
      data.forEach(row => {
        const countryCode = row.Country_Code?.toLowerCase();
        const div = document.createElement('div');
        div.className = 'video-item';
        div.setAttribute('data-year', row.Year);
        div.setAttribute('data-artist', row.Artist);
        div.setAttribute('data-song', row.Song);
        div.setAttribute('data-country', row.Country);

        div.innerHTML = `
          <div class="preview-container">
            <img src="images/${row.Year}-${countryCode?.toUpperCase()}.jpeg" alt="${row.Artist}"/>
          </div>
          <div class="video-title-with-icon" onclick="event.stopPropagation()">
            <a href="country.html?country=${row.Country}">
              <img class="flag-icon" src="/flags/${countryCode}.png" alt="Flag">
            </a>
            <div class="video-title-text">
              <b>${row.Artist}</b><br>${row.Song}<br>${row.Year}
            </div>
          </div>
        `;

        div.onclick = () => GDriveOpenModalWithVideo(row.Video_URL);
        container.appendChild(div);
      });

      document.getElementById("sort-options").dispatchEvent(new Event("change"));
    };

    document.addEventListener("DOMContentLoaded", () => {
      window.loadFanFavoritesFromSupabase();
    });
