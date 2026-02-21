import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

// -------------------------------------------------------------
// 🔒 AUTH STATE PROTECTION
// -------------------------------------------------------------
supabase.auth.onAuthStateChange((event, session) => {
    const isLoginPage = window.location.pathname.includes("login.html");

    if (!session && !isLoginPage) {
        window.location.href = "login.html";
    }
});

// -------------------------------------------------------------
// 🚀 Load header (NO banner logic)
// -------------------------------------------------------------
async function loadHeader() {

    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    // Inject shared header HTML
    const headerHtml = await fetch("/header.html").then(res => res.text());
    headerContainer.innerHTML = headerHtml;

    await new Promise(requestAnimationFrame);

    // Bind logout button
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = "login.html";
        });
    }

    // Render icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
