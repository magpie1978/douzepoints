import { escapeHTML, openModalStrict } from "./video-core.js";

export function renderEntry(entry) {

  const wrapper = document.createElement("div");
  wrapper.className = "video-item";

  const imageUrl =
    entry.Image ||
    `images/${entry.Year}-${entry.Country_Code}.jpeg`;

  wrapper.innerHTML = `
    <div class="preview-container">
      <img class="thumbnail"
           src="${escapeHTML(imageUrl)}">
    </div>
  `;

  wrapper.onclick = () =>
    openModalStrict(entry.Video_URL, entry);

  return wrapper;
}

export function renderVideos(entries) {

  const container = document.getElementById("video-container");
  if (!container) return;

  container.innerHTML = "";

  entries.forEach(entry=>{
    container.appendChild(renderEntry(entry));
  });

  if (window.lucide) lucide.createIcons();
}
