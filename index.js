function scrollCarousel(direction, trackId) {
  const track = document.getElementById(trackId);
  const itemWidth = track.querySelector('.video-item').offsetWidth + 20; // includes margin
  const scrollAmount = itemWidth * 5; // scroll 5 items

  track.scrollBy({
  left: direction * scrollAmount,
  behavior: 'smooth'
  });
}
