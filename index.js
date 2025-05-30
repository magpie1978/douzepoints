function OLDscrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20; // includes margin
  const scrollAmount = itemWidth * 5; // scroll 5 items

  track.scrollBy({
  left: direction * scrollAmount,
  behavior: 'smooth'
  });
}

function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20;
  const visibleItems = 5;
  const scrollAmount = itemWidth * visibleItems;

  const currentTransform = getComputedStyle(track).transform;
  let currentX = 0;

  if (currentTransform !== 'none') {
    const match = currentTransform.match(/matrix\(1, 0, 0, 1, (-?\d+), 0\)/);
    if (match) {
      currentX = parseInt(match[1], 10);
    }
  }

  let newX = currentX - direction * scrollAmount;

  // Boundaries: prevent over-scrolling
  const maxScroll = track.scrollWidth - scrollAmount;
  newX = Math.min(0, Math.max(-maxScroll, newX));

  track.style.transform = `translateX(${newX}px)`;
}
