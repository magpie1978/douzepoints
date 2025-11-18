import { supabase } from './supabaseClient.js';

/* -----------------------------
   LOGIN FUNCTIONALITY
----------------------------- */
document.getElementById("login-btn").onclick = async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const errorBox = document.getElementById("login-error");

    errorBox.textContent = "";

    if (!email || !password) {
        errorBox.textContent = "Please enter both email and password.";
        return;
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        errorBox.textContent = error.message;

        // Trigger shake animation
        errorBox.classList.remove("shake-error");
        void errorBox.offsetWidth;    // Force reflow to restart animation
        errorBox.classList.add("shake-error");

        return;
    }

    window.location.href = "index.html";
};

/* -----------------------------
   OPEN SIGNUP MODAL FROM PLAN CARDS
----------------------------- */
document.querySelectorAll(".signup-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById("signup-modal-overlay").style.display = "flex";
    });
});

/* -----------------------------
   CLOSE SIGNUP MODAL
----------------------------- */
document.getElementById("signup-close").onclick = () => {
    document.getElementById("signup-modal-overlay").style.display = "none";
};

/* -----------------------------
   SIGNUP FUNCTIONALITY
----------------------------- */
document.getElementById("signup-submit").onclick = async () => {
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const promo = document.getElementById("signup-promo").value.trim();
    const errorBox = document.getElementById("signup-error");

    errorBox.textContent = "";

    if (!email || !password) {
        errorBox.textContent = "Please enter both email and password.";
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

    errorBox.style.color = "#4ade80";  // green for success
    errorBox.textContent = "Account created! Check your email.";

    setTimeout(() => {
        document.getElementById("signup-modal-overlay").style.display = "none";
        errorBox.style.color = "#e50914"; // reset back to red for future errors
    }, 1500);
};
