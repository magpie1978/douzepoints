<script>
    document.addEventListener('DOMContentLoaded', async () => {
      const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';
      const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
      const { data, error } = await supabase.from('douzepoints').select('*').limit(1);
      if (error || !data.length) {
        document.body.innerHTML = '<p>Error retrieving table schema.</p>';
        return;
      }
  
      const example = data[0];
      const container = document.getElementById('fields-container');
  
      Object.keys(example).forEach(col => {
        if (col === 'id') return; // skip primary key if auto-generated
  
        const label = document.createElement('label');
        label.textContent = col;
        const input = document.createElement('input');
        input.name = col;
        input.required = true;
  
        // Set input type based on value
        const val = example[col];
        if      (typeof val === 'number') input.type = 'number';
        else if (typeof val === 'string') input.type = 'text';
        else                              input.type = 'text';
  
        label.appendChild(input);
        container.appendChild(label);
      });
  
      document.getElementById('add-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputs = Array.from(container.querySelectorAll('input, select, textarea'));
        const row = {};
        inputs.forEach(inp => {
          row[inp.name] = inp.value;
        });
  
        const { error: insertError } = await supabase.from('douzepoints').insert([row]);
        if (insertError) {
    alert('Error adding row: ' + insertError.message);
  } else {
    const msg = document.getElementById('message-container');
    msg.textContent = 'New row added successfully!';
    msg.style.color = 'green';
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }
  
      });
    });
    </script>
