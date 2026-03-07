import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});


// -------------------------------------------------------------
// 🚀 Load header (REMOVE banner completely)
// -------------------------------------------------------------
async function loadHeader() {

    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    // Inject shared header HTML
    const headerHtml = await fetch("header.html").then(res => res.text());
    headerContainer.innerHTML = headerHtml;

    await new Promise(requestAnimationFrame);

    // 🔥 REMOVE BANNER SECTION AFTER INJECTION
    const banner = document.getElementById("country-banner");
    if (banner) {
        const wrapper = banner.closest("div");
        if (wrapper) wrapper.remove();
        else banner.remove();
    }

    // Bind logout button
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = "index.html";
        });
    }

    // Render Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
