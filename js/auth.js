import { supabase } from './supabaseClient.js';

// --------- PUBLIC API ----------
export function openAuthModal(nextUrl = null) {
  const overlay = document.getElementById("auth-overlay");
  if (!overlay) return;

  overlay.style.display = "flex";

  // remember where to go after login
  if (nextUrl) sessionStorage.setItem("auth_next", nextUrl);
}

export function closeAuthModal() {
  const overlay = document.getElementById("auth-overlay");
  if (overlay) overlay.style.display = "none";
}

export async function requireAuth(nextUrl) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return true;
  openAuthModal(nextUrl);
  return false;
}

// --------- WIRING ----------
document.addEventListener("DOMContentLoaded", () => {
  // Close modal
  const closeBtn = document.getElementById("auth-close");
  if (closeBtn) closeBtn.addEventListener("click", closeAuthModal);

  const overlay = document.getElementById("auth-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeAuthModal();
    });
  }

  // Open signup modal
  const openSignup = document.getElementById("open-signup");
  if (openSignup) {
    openSignup.addEventListener("click", () => {
      document.getElementById("signup-modal-overlay").style.display = "flex";
    });
  }

  // Close signup modal
  const signupClose = document.getElementById("signup-close");
  if (signupClose) {
    signupClose.addEventListener("click", () => {
      document.getElementById("signup-modal-overlay").style.display = "none";
    });
  }

  // If you arrive with ?auth=1&next=my-favorites.html, open automatically
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth") === "1") {
    openAuthModal(params.get("next") || null);
  }

  bindLogin();
  bindSignup();
});

// --------- LOGIN (from your login.js) ----------
function bindLogin() {
  const btn = document.getElementById("login-btn");
  if (!btn) return;

  btn.onclick = async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const errorBox = document.getElementById("login-error");

    errorBox.style.display = "none";
    errorBox.textContent = "";

    if (!email || !password) {
      errorBox.textContent = "Please enter both email and password.";
      errorBox.style.display = "block";
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorBox.textContent = error.message;
      errorBox.style.display = "block";
      return;
    }

    closeAuthModal();

    const next = sessionStorage.getItem("auth_next");
    sessionStorage.removeItem("auth_next");
    if (next) window.location.href = next;
  };
}

// --------- SIGNUP (promo validation from your login.js) ----------
function bindSignup() {
  const btn = document.getElementById("signup-submit");
  if (!btn) return;

  btn.onclick = async () => {
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const promo = document.getElementById("signup-promo").value.trim();
    const errorBox = document.getElementById("signup-error");

    errorBox.style.color = "#e50914";
    errorBox.textContent = "";

    if (!email || !password) {
      errorBox.textContent = "Please enter both email and password.";
      return;
    }

    if (!promo) {
      errorBox.textContent = "A promo code is required to create an account.";
      return;
    }

    const { data: promoRows, error: promoError } = await supabase
      .from("promo_codes")
      .select("code")
      .ilike("code", promo);

    if (promoError) {
      errorBox.textContent = "Could not verify promo code. Try again later.";
      console.error("Promo code lookup error:", promoError);
      return;
    }

    if (!promoRows || promoRows.length === 0) {
      errorBox.textContent = "Invalid promo code.";
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { promo } }
    });

    if (error) {
      errorBox.textContent = error.message;
      return;
    }

    errorBox.style.color = "#4ade80";
    errorBox.textContent = "Account created! Check your email.";

    setTimeout(() => {
      document.getElementById("signup-modal-overlay").style.display = "none";
      errorBox.style.color = "#e50914";
    }, 1500);
  };
}
