document.addEventListener("DOMContentLoaded", () => {
    loadEditionHeader();
});

async function loadEditionHeader() {
    const editionParam = new URLSearchParams(window.location.search).get("edition");
    if (!editionParam) return;

    // Load base header HTML
    const headerHtml = await fetch("header.html").then(res => res.text());
    const headerContainer = document.getElementById("header-container");
    headerContainer.innerHTML = headerHtml;

    // Set banner image from /banners/{year}.png
    const bannerImg = document.getElementById("country-banner");
    if (bannerImg) {
        bannerImg.src = `/banners/${editionParam}.png`;
        bannerImg.alt = `Edition ${editionParam}`;
    }
}
