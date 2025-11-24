import { supabase } from './supabaseClient.js';

/* -----------------------------
   LOGIN FUNCTIONALITY
----------------------------- */
document.getElementById("login-btn").onclick = async () => {
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

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        errorBox.textContent = error.message;
        errorBox.style.display = "block";

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
/* -----------------------------
   SIGNUP WITH DATABASE PROMO CODE VALIDATION
----------------------------- */
document.getElementById("signup-submit").onclick = async () => {
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const promo = document.getElementById("signup-promo").value.trim();
    const errorBox = document.getElementById("signup-error");

    // Reset error display
    errorBox.style.color = "#e50914";
    errorBox.textContent = "";

    // Basic validation
    if (!email || !password) {
        errorBox.textContent = "Please enter both email and password.";
        return;
    }

    if (!promo) {
        errorBox.textContent = "A promo code is required to create an account.";
        return;
    }

    /* ----------------------------------------
       1) Validate promo code in Supabase table
       promo_codes table structure:
         id | code | description | active | ...
    ---------------------------------------- */
    const { data: promoRows, error: promoError } = await supabase
        .from("promo_codes")
        .select("code")
        .ilike("code", promo);   // case-insensitive exact match

    if (promoError) {
        errorBox.textContent = "Could not verify promo code. Try again later.";
        console.error("Promo code lookup error:", promoError);
        return;
    }

    if (!promoRows || promoRows.length === 0) {
        errorBox.textContent = "Invalid promo code.";
        return;
    }

    /* ----------------------------------------
       2) Promo code is valid → Create account
    ---------------------------------------- */
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { promo } }
    });

    if (error) {
    errorBox.textContent = error.message;
    errorBox.style.display = "block";

    errorBox.classList.remove("shake-error");
    void errorBox.offsetWidth;
    errorBox.classList.add("shake-error");
    return;
}


    // Success feedback
    errorBox.style.color = "#4ade80"; // green success
    errorBox.textContent = "Account created! Check your email.";

    setTimeout(() => {
        document.getElementById("signup-modal-overlay").style.display = "none";
        errorBox.style.color = "#e50914"; // reset to red for next time
    }, 1500);
};

