import { openModalStrict } from "./video-core.js";

function renderShowCard(entry){

  const wrapper = document.createElement("div");
  wrapper.className = "show-card";

  const year = entry.Year;
  const type = entry.Song;

  let image;

  if (type==="Semi Final 1")
    image=`/banners/${year}SF1.png`;
  else if (type==="Semi Final 2")
    image=`/banners/${year}SF2.png`;
  else
    image=`/banners/${year}F.png`;

  wrapper.innerHTML =
    `<img src="${image}">`;

  wrapper.onclick = () =>
    openModalStrict(entry.Video_URL, entry);

  return wrapper;
}

export function renderShows(entries){

  const container =
    document.getElementById("video-container");

  container.innerHTML="";

  const groups={};

  entries.forEach(e=>{
    const y=e.Year;
    if(!groups[y]) groups[y]=[];
    groups[y].push(e);
  });

  Object.keys(groups)
    .sort((a,b)=>b-a)
    .forEach(year=>{

      const section=document.createElement("section");

      section.innerHTML=`
        <div class="shows-banner">
          Eurovision Song Contest ${year}
        </div>
        <div class="shows-track"></div>
      `;

      const track=section.querySelector(".shows-track");

      groups[year].forEach(show=>{
        track.appendChild(renderShowCard(show));
      });

      container.appendChild(section);

    });

}
