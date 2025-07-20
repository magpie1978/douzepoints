// function attachSorting() {
//    const select = document.getElementById("sort-options");
//    select.addEventListener("change", function () {
//        const sortType = select.value;
//        const container = document.getElementById("video-container");
//        const items = Array.from(container.children);

//        if (sortType === "year-desc") {
//            items.sort((a, b) => parseInt(b.dataset.year) - parseInt(a.dataset.year));
//        } else if (sortType === "year-asc") {
//            items.sort((a, b) => parseInt(a.dataset.year) - parseInt(b.dataset.year));
//        } else if (sortType === "artist") {
//            items.sort((a, b) => a.dataset.artist.localeCompare(b.dataset.artist));
//        } else if (sortType === "song") {
//            items.sort((a, b) => a.dataset.song.localeCompare(b.dataset.song));
//        } else if (sortType === "country") {
//            items.sort((a, b) => a.dataset.country.localeCompare(b.dataset.country));
//        } else if (sortType === "country-desc") {
//            items.sort((a, b) => b.dataset.country.localeCompare(a.dataset.country));
//        } else if (sortType === "jury") {
//            items.sort((a, b) => {
//                const aVal = parseInt(a.dataset.jury) || 0;
//                const bVal = parseInt(b.dataset.jury) || 0;
//                return bVal - aVal;
//            });
//        } else if (sortType === "televote") {
//            items.sort((a, b) => {
//                const aVal = parseInt(a.dataset.televote) || 0;
//                const bVal = parseInt(b.dataset.televote) || 0;
//                return bVal - aVal;
//            });
//        } else if (sortType === "total") {
//            items.sort((a, b) => {
//                const aVal = parseInt(a.dataset.total) || 0;
//                const bVal = parseInt(b.dataset.total) || 0;
//                return bVal - aVal;
//            });
//        }

//        container.innerHTML = '';
//        items.forEach(item => container.appendChild(item));
//    });
//}

// function triggerInitialSort() {
//    attachSorting();
//    const select = document.getElementById("sort-options");
//    const event = new Event("change");
//    select.dispatchEvent(event);
//}



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
    } else if (sortType === "jury") {
      items.sort((a, b) => {
        const aVal = parseInt(a.dataset.jury) || 0;
        const bVal = parseInt(b.dataset.jury) || 0;
        return bVal - aVal;
      });
    } else if (sortType === "televote") {
      items.sort((a, b) => {
        const aVal = parseInt(a.dataset.televote) || 0;
        const bVal = parseInt(b.dataset.televote) || 0;
        return bVal - aVal;
      });
    } else if (sortType === "total") {
      items.sort((a, b) => {
        const aVal = parseInt(a.dataset.total) || 0;
        const bVal = parseInt(b.dataset.total) || 0;
        return bVal - aVal;
      });
    }

    // Toggle score-box visibility for 'total' sort
    const showTotal = sortType === "total";
    items.forEach(item => {
      const box = item.querySelector(".score-box");
      if (box) {
        box.style.display = showTotal ? "block" : "none";
      }
    });

    container.innerHTML = '';
    items.forEach(item => container.appendChild(item));
  });
}

function triggerInitialSort() {
  attachSorting();
  const select = document.getElementById("sort-options");
  const event = new Event("change");
  select.dispatchEvent(event);
}
