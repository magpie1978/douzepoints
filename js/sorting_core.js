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

  items.forEach((el) => {

    const first = firstRects.get(el);
    const last = el.getBoundingClientRect();

    const dx = first.left - last.left;
    const dy = first.top - last.top;

    el.style.transform = `translate(${dx}px, ${dy}px) scale(.92)`;
    el.style.opacity = "0.7";

    requestAnimationFrame(() => {

      el.style.transition =
        `transform 520ms cubic-bezier(.22,1,.36,1),
         opacity 300ms ease`;

      el.style.transform = "";
      el.style.opacity = "1";

    });

  });

}
