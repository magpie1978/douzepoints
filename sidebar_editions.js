(function() {
  fetch('sidebar_editions.html')
    .then(response => {
      if (!response.ok) throw new Error('Sidebar could not be loaded.');
      return response.text();
    })
    .then(data => {
      document.getElementById('sidebar-container').innerHTML = data;
    })
    .catch(err => console.error('Error loading sidebar:', err));
})();
