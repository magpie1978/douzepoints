(function() {
  fetch('OG_footer.html')
    .then(response => {
      if (!response.ok) throw new Error('Footer could not be loaded.');
      return response.text();
    })
    .then(data => {
      document.getElementById('footer').innerHTML = data;
    })
    .catch(err => console.error('Error loading footer:', err));
})();
