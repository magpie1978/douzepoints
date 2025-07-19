window.GDriveOpenModalWithVideo = function(videoUrl, titleText) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");
  modal.style.display = "flex";
  video.style.display = "none";
  iframe.style.display = "none";
  video.pause();
  iframe.src = "";
  if (videoUrl.includes('drive.google.com')) {
    const match = videoUrl.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      iframe.src = `https://drive.google.com/file/d/${match[1]}/preview`;
      iframe.style.display = "block";
    }
  } else {
    video.src = videoUrl;
    video.style.display = "block";
    video.play();
  }
};

window.GDriveCloseModal = function(event) {
  event.stopPropagation();
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  const iframe = document.getElementById("modalIframe");
  video.pause();
  video.src = "";
  iframe.src = "";
  modal.style.display = "none";
};

window.showPreview = function(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  img.style.display = 'none';
  video.style.display = 'block';
  video.play();
};

window.hidePreview = function(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  video.pause();
  video.style.display = 'none';
  img.style.display = 'block';
};



// Dynamically load modal.html into #modal-container
// This script dynamically loads the contents of modal.html into the page at runtime, but only after the DOM is fully loaded 
// and only if #modal-container exists. It's a clean way to modularize your HTML without server-side includes.

document.addEventListener('DOMContentLoaded', () => {             // Wait for the DOM to be ready — This ensures the code inside doesn’t run until the entire HTML document has been fully loaded and parsed. It's important because we want to be sure that the #modal-container element exists in the DOM before trying to access it.
const container = document.getElementById('modal-container');     // Get the target element — This finds the element in your HTML with id="modal-container" and stores it in a variable called container.
  if (container) {                                                // Check if the container exists — This prevents errors. If the element was found (i.e., it’s not null), the code inside the if block runs.
    fetch('modal.html')                                           // Fetch modal.html — This sends a request to load the contents of modal.html (a separate HTML file containing your modal markup).
      .then(response => response.text())                          // Convert the response to text — Once the file is fetched, this line converts the HTTP response (a stream of data) into plain text, which is what we want for HTML injection.
      .then(html => {                                             // Insert the HTML — This line takes the resulting HTML content and sets it as the innerHTML of the #modal-container element — effectively injecting the modal markup into your page.
        container.innerHTML = html;
      });
  } else {                                                        // Fallback warning — If the #modal-container element was not found in the DOM, this logs a warning to the browser console so developers know why the modal wasn’t loaded.
    console.warn('modal-container not found. Modal HTML was not loaded.');
  }
});
