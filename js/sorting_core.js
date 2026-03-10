export function applySorting(container, items, comparator) {

  const firstRects = new Map();

  items.forEach(el => {
    firstRects.set(el, el.getBoundingClientRect());
  });

  items.sort(comparator);

  const frag = document.createDocumentFragment();
  items.forEach(el => frag.appendChild(el));

  container.innerHTML = "";
  container.appendChild(frag);

  items.forEach((el,index) => {

    const first = firstRects.get(el);
    const last = el.getBoundingClientRect();
    if (!first) return;

    const dx = first.left - last.left;
    const dy = first.top - last.top;

    if (dx || dy) {

      el.style.transform = `translate(${dx}px,${dy}px) scale(.92)`;
      el.style.opacity = "0.7";
      el.style.zIndex = "20";
      el.style.boxShadow = "0 20px 40px rgba(0,0,0,.55)";

      requestAnimationFrame(()=>{

        el.style.transition =
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

}
