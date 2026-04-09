//import { applySorting } from "./sorting_core.js";

//function comparator(type){

//  const num=(el,k)=>Number(el.dataset[k]||0);
//  const txt=(el,k)=>(el.dataset[k]||"");

//  switch(type){

//    case "country":
//      return (a,b)=>txt(a,"country").localeCompare(txt(b,"country"));

//    case "country-desc":
//      return (a,b)=>txt(b,"country").localeCompare(txt(a,"country"));

//    case "artist":
//      return (a,b)=>txt(a,"artist").localeCompare(txt(b,"artist"));

//    case "song":
//      return (a,b)=>txt(a,"song").localeCompare(txt(b,"song"));

//    case "jury":
//      return (a,b)=>num(b,"jury")-num(a,"jury");

//    case "televote":
//      return (a,b)=>num(b,"televote")-num(a,"televote");

//    case "total":
//      return (a,b)=>num(b,"total")-num(a,"total");

//    default:
//      return ()=>0;

//  }

//}

//document.addEventListener("DOMContentLoaded",()=>{

//  const select=document.getElementById("sort-options");
//  const container=document.getElementById("video-container");

//  function runSort(){
//    const items=[...container.children];

//    applySorting(
//      container,
//      items,
//      comparator(select.value)
//    );
//  }

//  select.addEventListener("change", runSort);

  // ⭐ expose global function so video.js can trigger sorting
//  window.triggerInitialSort = runSort;

//});





//------------------------------------------
//  REVISED SORTING CODE 9 APRIL 2026
//------------------------------------------

import { applySorting } from "./sorting_core.js";

function comparator(type) {
  const num = (el, k) => Number(el.dataset[k] || 0);
  const txt = (el, k) => (el.dataset[k] || "");

  switch (type) {
    case "country":
      return (a, b) => txt(a, "country").localeCompare(txt(b, "country"));

    case "country-desc":
      return (a, b) => txt(b, "country").localeCompare(txt(a, "country"));

    case "artist":
      return (a, b) => txt(a, "artist").localeCompare(txt(b, "artist"));

    case "song":
      return (a, b) => txt(a, "song").localeCompare(txt(b, "song"));

    case "jury":
      return (a, b) => num(b, "jury") - num(a, "jury");

    case "televote":
      return (a, b) => num(b, "televote") - num(a, "televote");

    case "total":
      return (a, b) => num(b, "total") - num(a, "total");

    default:
      return () => 0;
  }
}

//---------------------------------------------------------------
//  NEW CODE 9 APRIL
//----------------------------------------------------------------
function notifyCards(sortType, container) {
  container.querySelectorAll(".video-item").forEach(card => {
    card.dispatchEvent(
      new CustomEvent("edition-sort-changed", {
        detail: { sortType }
      })
    );
  });
}
//---------  END  -----------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("sort-options");
  const container = document.getElementById("video-container");

  function notifyCards(sortType) {
    container.querySelectorAll(".video-card").forEach(card => {
      card.dispatchEvent(
        new CustomEvent("edition-sort-changed", {
          bubbles: false,
          detail: { sortType }
        })
      );
    });
  }

  //--------------------------------------------------------------
  // -------------- NEW CODE 9 APRIL -----------------------------
  //--------------------------------------------------------------
  
  //function runSort() {
  //  const items = [...container.children];
  //  const sortType = select.value;

  //  applySorting(
  //    container,
  //    items,
  //    comparator(sortType)
  //  );

  //  notifyCards(sortType);
  //}

  function runSort() {
    const items = [...container.children];
    const sortType = select.value;

    applySorting(container, items, comparator(sortType));

    notifyCards(sortType, container);
  }
  // -----------------  END  -------------------------------
  
  
  select.addEventListener("change", runSort);

  // expose global function so video.js can trigger initial sort after cards are rendered
  window.triggerInitialSort = runSort;
});
