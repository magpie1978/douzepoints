import { supabase } from './supabaseClient.js';


// ✅ Redirect if already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    window.location.href = 'add.html';
  }
});

//document.getElementById('auth-form').addEventListener('submit', async (e) => {
//  e.preventDefault();
//  const email = document.getElementById('email').value;
//  const password = document.getElementById('password').value;
//  const status = document.getElementById('auth-status');

  // Try logging in
//  let { error } = await supabase.auth.signInWithPassword({ email, password });

//  if (error && error.message === 'Invalid login credentials') {
    // If user doesn't exist, try signing up
//    ({ error } = await supabase.auth.signUp({ email, password }));
//    if (error) {
//      status.textContent = 'Signup failed: ' + error.message;
//      status.style.color = 'red';
//      return;
//    }
//    status.textContent = 'Signup successful! Check your email.';
//    status.style.color = 'lightgreen';
//  } else if (error) {
//    status.textContent = 'Login error: ' + error.message;
//    status.style.color = 'red';
//    return;
//  } else {
//    status.textContent = 'Login successful! Redirecting...';
//    status.style.color = 'lightgreen';


document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  const promoCode = document.getElementById("promoCode").value.trim();

  // 1. Validate promo code securely in Supabase
  const { data: promoValid, error: promoError } = await supabase.rpc(
    'validate_promo',
    { promo: promoCode }
  );

  if (promoError || promoValid !== true) {
    alert("Sorry, we're not able to offer you an account at this stage.");
    return;
  }

  // 2. Create Supabase Auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert("Sign-up failed: " + error.message);
    return;
  }

  const user = data.user;
  if (!user) {
    alert("Unexpected error: user not created.");
    return;
  }

  // 3. Add user to your public.users table
  const { error: insertError } = await supabase
    .from("users")
    .insert({
      id: user.id,
      email: user.email,
      display_name: null,
      subscription_level: "basic"
    });

  if (insertError) {
    alert("Account created but failed to save profile.");
  }

  alert("Account created! Please verify your email.");
  showLogin();
});



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
