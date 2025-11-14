// header.js
import { supabase } from './supabaseClient.js';

/* ------------------------------------------------------
   INITIAL HEADER LOAD
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    loadHeader().catch(err => {
        console.error("HEADER FAILED:", err);
    });
});

/* ------------------------------------------------------
   LOAD HEADER + SAFE BANNER LOGIC
------------------------------------------------------- */
async function loadHeader() {
    // Load header HTML
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    try {
        const headerHtml = await fetch("header.html").then(res => res.text());
        headerContainer.innerHTML = headerHtml;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error("HEADER LOAD ERROR:", err);
        return; // Stop here, but DO NOT stop page scripts
    }

    // Only country.html has a banner
    const banner = document.getElementById("country-banner");
    if (!banner) return;

    /* Wrap ALL banner logic safely */
    try {
        const path = window.location.pathname;

        const country = new URLSearchParams(window.location.search).get("country");
        const editionYear = new URLSearchParams(window.location.search).get("edition");

        const isIndexPage = path === "/" || path.endsWith("index.html");
        const isCountryPage = path.includes("country.html");
        const isEditionPage = path.includes("edition.html");
        const isWinnersPage = path.includes("winners.html");
        const isFavouritesPage = path.includes("fan-favorites.html");
        const isScoreboardPage = path.includes("scoreboard.html");
        const isAboutPage = path.includes("about.html");
        const isContactPage = path.includes("contact.html");
        const isFAQPage = path.includes("faq.html");
        const isPrivacyPage = path.includes("privacy.html");

        if (isWinnersPage) {
            banner.src = "/banners/winners.png";
            banner.alt = "Winners";
        }

        else if (isIndexPage) {
            banner.src = "/banners/douzepoints.png";
            banner.alt = "Home";
        }

        else if (isFavouritesPage) {
            banner.src = "/banners/fanfavorites.png";
            banner.alt = "Fan Favorites";
        }

        else if (isEditionPage && editionYear) {
            const { data, error } = await supabase
                .from("douzepoints")
                .select("LocationCountry")
                .eq("Year", editionYear)
                .limit(1);

            if (error) throw error;
            const code = data?.[0]?.LocationCountry?.toLowerCase();

            if (code) {
                banner.src = `/banners/${editionYear}.png`;
                banner.alt = editionYear;
            }
        }

        else if (isCountryPage && country) {
            const { data, error } = await supabase
                .from("douzepoints")
                .select("Country_Code")
                .ilike("Country", country)
                .limit(1);

            if (error) throw error;
            const code = data?.[0]?.Country_Code?.toLowerCase();

            if (code) {
                const bannerPath = `/banners/${code}.png`;
                banner.src = bannerPath;
                banner.alt = country;
            }
        }

        else if (isScoreboardPage) {
            banner.src = "/banners/douzepoints.png";
            banner.alt = "Scoreboard";
        }

        else if (isAboutPage) {
            banner.src = "/banners/about.png";
            banner.alt = "About";
        }

        else if (isContactPage) {
            banner.src = "/banners/contact.png";
            banner.alt = "Contact";
        }

        else if (isFAQPage) {
            banner.src = "/banners/faq.png";
            banner.alt = "FAQ";
        }

        else if (isPrivacyPage) {
            banner.src = "/banners/privacy.png";
            banner.alt = "Privacy";
        }

    } catch (err) {
        console.error("BANNER ERROR (safe to ignore):", err);
    }
}

/* ------------------------------------------------------
   LOGOUT (GLOBAL)
------------------------------------------------------- */
window.logout = async function () {
    await supabase.auth.signOut();
    window.location.href = "login.html";
};

/* ------------------------------------------------------
   PROFILE CREATION AFTER SIGN-IN
------------------------------------------------------- */
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event !== "SIGNED_IN" || !session) return;

    const user = session.user;

    try {
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
        }
    } catch (err) {
        console.error("PROFILE INSERT ERROR:", err);
    }
});
