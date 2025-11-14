// header.js
import { supabase } from "./supabaseClient.js";

/* ------------------------------------------------------
   1. INITIALISE HEADER
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadHeader().catch(err => {
    console.error("HEADER LOAD FAILURE:", err);
  });
});

/* ------------------------------------------------------
   2. LOAD HEADER + DYNAMIC BANNER
------------------------------------------------------- */
async function loadHeader() {
  const headerContainer = document.getElementById("header-container");
  if (!headerContainer) {
    console.error("header-container not found");
    return;
  }

  /* Load header.html */
  try {
    const html = await fetch("header.html").then(r => r.text());
    headerContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("FAILED TO LOAD header.html:", err);
    return;
  }

  /* Look for banner element */
  const banner = document.getElementById("country-banner");

  // If there is no banner on this page, skip safely
  if (!banner) {
    console.info("No #country-banner element on this page.");
    return;
  }

  /* ------------------------------------------------------
     SAFE BANNER LOGIC (never breaks other scripts)
  ------------------------------------------------------- */
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

    /* Static banners */
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
      banner.alt = "Fan Favourites";
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

    /* Edition banner */
    else if (isEditionPage && editionYear) {
      try {
        const { data, error } = await supabase
          .from("douzepoints")
          .select("LocationCountry")
          .eq("Year", editionYear)
          .limit(1);

        if (error) throw error;

        const location = data?.[0]?.LocationCountry;
        if (location) {
          banner.src = `/banners/${editionYear}.png`;
          banner.alt = editionYear;
        }
      } catch (err) {
        console.warn("Edition banner load failed:", err.message);
      }
    }

    /* Country banner */
    else if (isCountryPage && country) {
      try {
        const { data, error } = await supabase
          .from("douzepoints")
          .select("Country_Code")
          .ilike("Country", country)
          .limit(1);

        if (error) throw error;

        const code = data?.[0]?.Country_Code?.toLowerCase();
        if (code) {
          banner.src = `/banners/${code}.png`;
          banner.alt = country;
        }
      } catch (err) {
        console.warn("Country banner load failed:", err.message);
      }
    }

  } catch (err) {
    console.error("BANNER LOGIC ERROR (safe):", err);
  }
}

/* ------------------------------------------------------
   3. LOGOUT BUTTON (GLOBAL)
------------------------------------------------------- */
window.logout = async function() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
};

/* ------------------------------------------------------
   4. AUTO-CREATE USER PROFILE AFTER SIGN-IN
------------------------------------------------------- */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event !== "SIGNED_IN" || !session) return;

  const user = session.user;

  try {
    const { data: exists, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!exists) {
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata.full_name || null,
          subscription_level: "basic"
        });

      if (insertError) {
        console.error("Profile insert failed:", insertError.message);
      }
    }
  } catch (err) {
    console.error("PROFILE CREATION ERROR:", err);
  }
});
