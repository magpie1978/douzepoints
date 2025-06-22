function attachSorting() {
    const select = document.getElementById("sort-options");
    select.addEventListener("change", function () {
        const sortType = select.value;
        const container = document.getElementById("video-container");
        const items = Array.from(container.children);

        if (sortType === "year-desc") {
            items.sort((a, b) => parseInt(b.dataset.year) - parseInt(a.dataset.year));
        } else if (sortType === "year-asc") {
            items.sort((a, b) => parseInt(a.dataset.year) - parseInt(b.dataset.year));
        } else if (sortType === "artist") {
            items.sort((a, b) => a.dataset.artist.localeCompare(b.dataset.artist));
        } else if (sortType === "song") {
            items.sort((a, b) => a.dataset.song.localeCompare(b.dataset.song));
        } else if (sortType === "country") {
            items.sort((a, b) => a.dataset.country.localeCompare(b.dataset.country));
        } else if (sortType === "country-desc") {
            items.sort((a, b) => b.dataset.country.localeCompare(a.dataset.country));
        }

        container.innerHTML = '';
        items.forEach(item => container.appendChild(item));
    });
}

// ✅ Called from edition.js after content is loaded
function triggerInitialSort() {
    attachSorting();
    const select = document.getElementById("sort-options");
    select.value = "year-desc"; // ensure it's set visually
    const event = new Event("change");
    select.dispatchEvent(event);
}
