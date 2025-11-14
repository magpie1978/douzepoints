import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  // Skip guard on login page
  if (window.location.pathname.includes("login.html")) return;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
  }
});
