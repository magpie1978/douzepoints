//const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
//const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';

//const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { supabase } from './supabaseClient.js';


// ✅ Redirect if already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    window.location.href = 'add.html';
  }
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const status = document.getElementById('auth-status');

  // Try logging in
  let { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error && error.message === 'Invalid login credentials') {
    // If user doesn't exist, try signing up
    ({ error } = await supabase.auth.signUp({ email, password }));
    if (error) {
      status.textContent = 'Signup failed: ' + error.message;
      status.style.color = 'red';
      return;
    }
    status.textContent = 'Signup successful! Check your email.';
    status.style.color = 'lightgreen';
  } else if (error) {
    status.textContent = 'Login error: ' + error.message;
    status.style.color = 'red';
    return;
  } else {
    status.textContent = 'Login successful! Redirecting...';
    status.style.color = 'lightgreen';

    // Ensure session is available before redirect
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      window.location.href = 'add.html';
    } else {
      status.textContent = 'Could not verify session.';
      status.style.color = 'orange';
    }
  }
});
