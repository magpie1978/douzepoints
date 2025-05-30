function OLDscrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20; // includes margin
  const scrollAmount = itemWidth * 5; // scroll 5 items

  track.scrollBy({
  left: direction * scrollAmount,
  behavior: 'smooth'
  });
}

const carouselPositions = {};

function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20; // item + gap
  const visibleItems = 5;
  const totalItems = track.querySelectorAll('.video-item').length;
  const maxIndex = Math.ceil(totalItems / visibleItems) - 1;

  // Init position tracker
  if (!(trackId in carouselPositions)) {
    carouselPositions[trackId] = 0;
  }

  // Update position
  carouselPositions[trackId] += direction;
  if (carouselPositions[trackId] < 0) carouselPositions[trackId] = 0;
  if (carouselPositions[trackId] > maxIndex) carouselPositions[trackId] = maxIndex;

  const offset = carouselPositions[trackId] * visibleItems * itemWidth;
  track.style.transform = `translateX(-${offset}px)`;
}
