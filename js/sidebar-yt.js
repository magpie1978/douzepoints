// SIDEBAR.JS — UMD Supabase client
const supabase = window.supabaseClient;

document.addEventListener("DOMContentLoaded", () => {
    loadSidebarYears();
});

async function loadSidebarYears() {
    const container = document.getElementById("sidebar-container");
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from("douzepoints")
            .select("Year")
            .order("Year", { ascending: false });

        if (error) throw error;

        const years = [...new Set(data.map(row => row.Year))];

        container.innerHTML = years
            .map(y => `<a class="sidebar-row" href="/edition.html?edition=${y}">${y}</a>`)
            .join("");

    } catch (err) {
        console.error("[SIDEBAR] Failed to load years", err);
    }
}
