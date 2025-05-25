/*  LOGIN SCRIPT */
/* if (sessionStorage.getItem("loggedIn") !== "true") { */
/*   window.location.href = "login.html"; */
/* } */


function openModalWithVideo(videoUrl) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");

  modal.style.display = "flex";
  video.src = videoUrl;
  video.style.display = "block";
  video.play();

  // Ensure iframe is not used
  const iframe = document.getElementById("modalIframe");
  iframe.style.display = "none";
  iframe.src = "";
}



function closeModal() {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("modalVideo");
  video.pause();
  video.src = "";
  modal.style.display = "none";
}


function showPreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  img.style.display = 'none';
  video.style.display = 'block';
  video.play();
}

function hidePreview(container) {
  const video = container.querySelector('video');
  const img = container.querySelector('img');
  video.pause();
  video.style.display = 'none';
  img.style.display = 'block';
}


/* script to display sidebar country selector */
fetch('sidebar.html')
  .then(response => {
    if (!response.ok) {
      throw new Error('Sidebar could not be loaded.');
    }
    return response.text();
  })
  .then(data => {
    document.getElementById('sidebar-container').innerHTML = data;
  })
  .catch(error => {
    console.error('Error loading sidebar:', error);
  });
