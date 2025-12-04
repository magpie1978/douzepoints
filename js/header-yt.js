// HEADER.JS — UMD Supabase client
const supabase = window.supabaseClient;

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
});

async function loadHeader() {
    try {
        const path = window.location.pathname;
        const headerHtml = await fetch("/header.html").then(res => res.text());
        const container = document.getElementById("header-container");

        if (!container) return;

        container.innerHTML = headerHtml;

        // Optional logout handling
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                await supabase.auth.signOut();
                window.location.href = "/login.html";
            });
        }

        // Banner logic (your existing logic remains the same)
        const banner = document.getElementById("country-banner");
        const edition = new URLSearchParams(window.location.search).get("edition");

        if (banner && edition) {
            banner.src = `/banners/${edition}.png`;
        }

    } catch (err) {
        console.error("[HEADER] Failed to load header:", err);
    }
}
