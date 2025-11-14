// header.js
import { supabase } from "./supabaseClient.js";

/* ------------------------------------------------------
   INITIAL HEADER LOAD
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

/* ------------------------------------------------------
   LOAD HEADER + SAFE BANNER LOGIC
------------------------------------------------------- */
async function loadHeader() {
  try {
    const path = window.location.pathname;

    // Load header.html
    const headerHtml = await fetch("header.html").then((res) => res.text());
    const headerContainer = document.getElementById("header-container");

    if (!headerContainer) {
      console.error("header-container not found");
      return;
    }

    headerContainer.innerHTML = headerHtml;

    if (window.lucide) window.lucide.createIcons();

    // Banner may not exist on most pages
    const banner = document.getElementById("country-banner");
    if (!banner) {
      console.info("No #country-banner on this page (this is normal).");
      return;
    }

    /* ------------------------------------------
       ALL BANNER LOGIC WRAPPED IN TRY/CATCH
       SO THAT ERRORS CANNOT BREAK THE PAGE
    ------------------------------------------- */
    try {
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

      } else if (isIndexPage) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "Home";

      } else if (isFavouritesPage) {
        banner.src = "/banners/fanfavorites.png";
        banner.alt = "Fan Favourites";

      } else if (isEditionPage && editionYear) {
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

      } else if (isCountryPage && country) {
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

      } else if (isScoreboardPage) {
        banner.src = "/banners/douzepoints.png";
        banner.alt = "Scoreboard";

      } else if (isAboutPage) {
        banner.src = "/banners/about.png";
        banner.alt = "About";

      } else if (isContactPage) {
        banner.src = "/banners/contact.png";
        banner.alt = "Contact";

      } else if (isFAQPage) {
        banner.src = "/banners/faq.png";
        banner.alt = "FAQ";

      } else if (isPrivacyPage) {
        banner.src = "/banners/privacy.png";
        banner.alt = "Privacy";
      }
    } catch (innerErr) {
      console.error("⚠ Banner logic error (but page continues safely):", innerErr);
    }
  } catch (outerErr) {
    console.error("❌ header.js failed (critical):", outerErr);
  }
}

/* ------------------------------------------------------
   GLOBAL LOGOUT FUNCTION
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
    const { data: existing, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (error) {
      console.warn("Profile check error:", error.message);
    }

    if (!existing) {
      console.log("🆕 Creating profile for:", user.email);

      const { error: insertErr } = await supabase.from("users").insert({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata.full_name || null,
        subscription_level: "basic",
      });

      if (insertErr) {
        console.error("Failed to insert profile:", insertErr.message);
      }
    }
  } catch (err) {
    console.error("Profile creation error:", err);
  }
});
