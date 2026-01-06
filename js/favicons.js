(() => {
  fetch("/favicons.html")
    .then(res => res.text())
    .then(html => {
      document.head.insertAdjacentHTML("beforeend", html);
    })
    .catch(err => console.error("Failed to load favicons:", err));
})();
