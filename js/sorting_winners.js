import { applySorting } from "./sorting_core.js";

function comparator(type){

  const num=(el,k)=>Number(el.dataset[k]||0);
  const txt=(el,k)=>(el.dataset[k]||"");

  switch(type){

    case "year-desc":
      return (a,b)=>num(b,"year")-num(a,"year");

    case "year-asc":
      return (a,b)=>num(a,"year")-num(b,"year");

    case "country":
      return (a,b)=>txt(a,"country").localeCompare(txt(b,"country"));

    case "country-desc":
      return (a,b)=>txt(b,"country").localeCompare(txt(a,"country"));

    case "artist":
      return (a,b)=>txt(a,"artist").localeCompare(txt(b,"artist"));

    case "song":
      return (a,b)=>txt(a,"song").localeCompare(txt(b,"song"));

  }

}

document.addEventListener("DOMContentLoaded",()=>{

  const select=document.getElementById("sort-options");
  const container=document.getElementById("video-container");

  select.addEventListener("change",()=>{

    const items=[...container.children];

    applySorting(
      container,
      items,
      comparator(select.value)
    );

  });

});
