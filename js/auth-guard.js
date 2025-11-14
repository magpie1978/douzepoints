import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  // Skip redirect on login page
  if (window.location.pathname.endsWith("login.html")) return;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    // Not logged in → redirect
    window.location.href = "login.html";
  }
});
