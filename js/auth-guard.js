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


supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN") {
    const user = session.user;

    // Check if profile already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existing) {
      await supabase.from("users").insert({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata.full_name || null,
        subscription_level: "basic"
      });

      console.log("Profile created:", user.email);
    }
  }
});
