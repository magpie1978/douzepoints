import { renderEntry } from "./video_grid.js";
import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", loadHome);


// ---------------------------------------------------
// HOMEPAGE LOADER
// ---------------------------------------------------

async function loadHome() {

  // Winners
  const { data: winners } = await supabase
    .from("douzepoints")
    .select("*")
    .eq("Final_Rank", 1)
    .order("Year", { ascending: false })
    .limit(40);

  renderIntoCarousel("carouselTrack1", winners || []);


  // Basel 2025
  const { data: basel } = await supabase
    .from("douzepoints")
    .select("*")
    .eq("Year", 2025)
    .order("Final_Rank");

  renderIntoCarousel("carouselTrack4", basel || []);


  // Malmö 2024
  const { data: malmo } = await supabase
    .from("douzepoints")
    .select("*")
    .eq("Year", 2024)
    .order("Final_Rank");

  renderIntoCarousel("carouselTrack2", malmo || []);


  // Fan favorites
  const { data: faves } = await supabase
    .from("douzepoints")
    .select("*")
    .eq("FanFave", "Y")
    .order("Year", { ascending: false });

  renderIntoCarousel("carouselTrack3", faves || []);
}



// ---------------------------------------------------
// CAROUSEL RENDERER
// ---------------------------------------------------

function renderIntoCarousel(trackId, entries){

  const track = document.getElementById(trackId);
  if(!track) return;

  track.innerHTML = "";

  entries.forEach(entry=>{
    track.appendChild(renderEntry(entry));
  });

  if(window.lucide) lucide.createIcons();
}
