import { renderEntry } from "./video-grid.js";

export function renderIntoCarousel(trackId, entries){

  const track=document.getElementById(trackId);
  if(!track) return;

  track.innerHTML="";

  entries.forEach(entry=>{
    track.appendChild(renderEntry(entry));
  });

  if(window.lucide) lucide.createIcons();
}
