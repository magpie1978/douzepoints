function OLDscrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20; // includes margin
  const scrollAmount = itemWidth * 5; // scroll 5 items

  track.scrollBy({
  left: direction * scrollAmount,
  behavior: 'smooth'
  });
}

const carouselStates = {};

function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20; // item + gap
  const visibleItems = 5;

  // Total number of items
  const totalItems = track.querySelectorAll('.video-item').length;
  const totalGroups = Math.ceil(totalItems / visibleItems);

  // Track current scroll index per carousel
  if (!(trackId in carouselStates)) {
    carouselStates[trackId] = 0;
  }

  // Update index
  carouselStates[trackId] += direction;

  if (carouselStates[trackId] < 0) carouselStates[trackId] = 0;
  if (carouselStates[trackId] > totalGroups - 1) {
    carouselStates[trackId] = totalGroups - 1;
  }

  const scrollX = carouselStates[trackId] * itemWidth * visibleItems;
  track.style.transform = `translateX(-${scrollX}px)`;
}
