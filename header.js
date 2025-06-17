<!-- HEADER SCRIPT -->


// Define country code (can be dynamic or from metadata or URL)
const countryCode = document.body.getAttribute("data-country");

// Load header.html and insert it
fetch("header.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("header-container").innerHTML = data;
        // Set banner image after header loads
        const bannerImg = document.getElementById("country-banner");
        if (bannerImg) {
            bannerImg.src = `/banners/${countryCode}.png`;
        }
    });
