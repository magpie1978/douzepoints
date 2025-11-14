// auth-guard.js
import { supabase } from './supabaseClient.js';

/* ------------------------------------------------------
   1. Redirect unauthenticated users to login.html
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const current = window.location.pathname;

  // Do NOT redirect on login page
  if (current.endsWith("login.html")) return;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
  }
});


/* ------------------------------------------------------
   2. Create user profile AFTER they verify email + sign in
      This fires EXACTLY when:
      - They click their Supabase confirmation e-mail
      - Or they sign in normally after confirming
------------------------------------------------------- */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event !== "SIGNED_IN" || !session) return;

  const user = session.user;
  if (!user) return;

  // Check if this user already has a profile row
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!existing) {
    console.log("Creating user profile row for:", user.email);

    await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata.full_name || null,
      subscription_level: "basic"
    });
  }
});
