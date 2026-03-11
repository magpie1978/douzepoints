import { applySorting } from "./sorting_core.js";

function comparator(type){

  const num=(el,k)=>Number(el.dataset[k]||0);
  const txt=(el,k)=>(el.dataset[k]||"");

  switch(type){

    case "place":
      return (a,b)=>num(a,"place")-num(b,"place");

    case "running":
      return (a,b)=>num(a,"running")-num(b,"running");

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
