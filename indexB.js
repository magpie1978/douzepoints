
function scrollCarousel(direction, carouselId) {
  const track = document.getElementById(carouselId);
  if (!track) return;

  const item = track.querySelector('.video-item');
  if (!item) return;

  const itemStyle = window.getComputedStyle(item);
  const itemWidth = item.offsetWidth + parseInt(itemStyle.marginLeft) + parseInt(itemStyle.marginRight);
  const scrollAmount = itemWidth * 5;

  track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  setTimeout(() => updateCarouselButtons(carouselId), 400);
}

function updateCarouselButtons(carouselId) {
  const track = document.getElementById(carouselId);
  const wrapper = track.parentElement;
  const [prevBtn, nextBtn] = wrapper.querySelectorAll('.carousel-button');

  const maxScrollLeft = track.scrollWidth - track.clientWidth;

  prevBtn.style.display = track.scrollLeft <= 5 ? 'none' : 'block';
  nextBtn.style.display = track.scrollLeft >= maxScrollLeft - 5 ? 'none' : 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  ['carouselTrack1'].forEach(updateCarouselButtons);
});
