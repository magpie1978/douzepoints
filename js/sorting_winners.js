(function () {

  //------------------------------------------------------------
  // Comparator
  //------------------------------------------------------------
  function comparatorFactory(sortType){

    const num=(el,k)=>Number(el.dataset[k]||0);
    const txt=(el,k)=>(el.dataset[k]||"");

    switch(sortType){

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

      case "jury":
        return (a,b)=>num(b,"jury")-num(a,"jury");
      
      case "televote":
        return (a,b)=>num(b,"televote")-num(a,"televote");
      
      case "total":
        return (a,b)=>num(b,"total")-num(a,"total");  

      default:
        return ()=>0;
    }

  }

  //------------------------------------------------------------
  // Sorting + animation
  //------------------------------------------------------------
  function attachSorting(){

    const select=document.getElementById("sort-options");
    const container=document.getElementById("video-container");

    if(!select||!container) return;

    select.addEventListener("change",()=>{

      const items=[...container.children];
      const sortType=select.value;

      const firstRects=new Map();
      items.forEach(el=>{
        firstRects.set(el,el.getBoundingClientRect());
      });

      items.sort(comparatorFactory(sortType));

      const frag=document.createDocumentFragment();
      items.forEach(el=>frag.appendChild(el));

      container.innerHTML="";
      container.appendChild(frag);

      items.forEach((el,index)=>{

        const first=firstRects.get(el);
        const last=el.getBoundingClientRect();
        if(!first) return;

        const dx=first.left-last.left;
        const dy=first.top-last.top;

        if(dx||dy){

          el.style.transform=`translate(${dx}px,${dy}px) scale(.92)`;
          el.style.opacity="0.7";
          el.style.zIndex="20";
          el.style.boxShadow="0 20px 40px rgba(0,0,0,.55)";

          requestAnimationFrame(()=>{

            el.style.transition=
              `transform 520ms cubic-bezier(.22,1,.36,1) ${index*50}ms,
               opacity 300ms ease ${index*50}ms,
               box-shadow 520ms ease ${index*50}ms`;

            el.style.transform="";
            el.style.opacity="1";
            el.style.boxShadow="";
            el.style.zIndex="";

          });

        }

      });

    });

  }

  //------------------------------------------------------------
  // Default sorting
  //------------------------------------------------------------
  function triggerInitialSort(){

    const select=document.getElementById("sort-options");
    if(!select) return;

    select.value="year-desc";
    select.dispatchEvent(new Event("change"));

  }

  document.addEventListener("DOMContentLoaded",attachSorting);
  window.triggerInitialSort=triggerInitialSort;

})();
